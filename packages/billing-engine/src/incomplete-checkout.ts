import {
  createWebhookEvent,
  normalizeEvmAddress,
  type BillingWebhookEvent,
  type CreateSubscriptionInput,
  type RecurringInvoice,
  type RecurringSubscription,
} from "@autlantic/payments-recurring-core";
import { newId } from "./id";
import { getOnChainSubscriptionId } from "./on-chain";
import { voidInvoice } from "./refunds";
import { cancelSubscription, createSubscription, updateSubscriptionCustomerWallet } from "./subscriptions";
import type { BillingStore, CreateSubscriptionResult } from "./types";

/** Wallet used when checkout is created before the customer connects MetaMask. */
export const PENDING_CHECKOUT_WALLET = "0x0000000000000000000000000000000000000001";

/** Abandoned incomplete checkouts older than this are canceled and their open invoices voided. */
export const DEFAULT_INCOMPLETE_CHECKOUT_TTL_MS = 24 * 60 * 60 * 1000;

export function isPendingCheckoutWallet(address: string | null | undefined): boolean {
  if (!address?.trim()) return true;
  try {
    return normalizeEvmAddress(address) === PENDING_CHECKOUT_WALLET;
  } catch {
    return true;
  }
}

function metaValue(sub: RecurringSubscription, key: string): string {
  return (sub.metadata?.[key] ?? "").trim();
}

function planIdentity(sub: RecurringSubscription): string {
  return (
    (sub.planId ?? "").trim() ||
    metaValue(sub, "planId") ||
    metaValue(sub, "priceId") ||
    metaValue(sub, "billingPriceId")
  );
}

function customerIdentity(sub: RecurringSubscription): string {
  const userId = metaValue(sub, "subscriberUserId");
  if (userId) return `user:${userId}`;
  const email = metaValue(sub, "customerEmail").toLowerCase();
  if (email) return `email:${email}`;
  if (!isPendingCheckoutWallet(sub.walletAddress)) {
    return `wallet:${normalizeEvmAddress(sub.walletAddress)}`;
  }
  return "";
}

function inputPlanIdentity(input: CreateSubscriptionInput): string {
  return (
    (input.planId ?? "").trim() ||
    (input.metadata?.planId ?? "").trim() ||
    (input.metadata?.priceId ?? "").trim() ||
    (input.metadata?.billingPriceId ?? "").trim()
  );
}

function inputCustomerIdentity(input: CreateSubscriptionInput): string {
  const userId = (input.metadata?.subscriberUserId ?? "").trim();
  if (userId) return `user:${userId}`;
  const email = (input.metadata?.customerEmail ?? "").trim().toLowerCase();
  if (email) return `email:${email}`;
  if (!isPendingCheckoutWallet(input.walletAddress)) {
    return `wallet:${normalizeEvmAddress(input.walletAddress)}`;
  }
  return "";
}

function sameMode(a: RecurringSubscription, mode: CreateSubscriptionInput["mode"]): boolean {
  return (a.mode ?? "test") === (mode ?? "test");
}

/**
 * Find an open incomplete checkout that should be resumed instead of creating another.
 * Prefer merchantRef (stable Autlantic key), else plan + customer identity.
 */
export function findReusableIncompleteSubscription(
  store: BillingStore,
  input: Pick<CreateSubscriptionInput, "merchantId" | "merchantRef" | "planId" | "metadata" | "walletAddress" | "mode">,
): RecurringSubscription | null {
  const merchantRef = input.merchantRef.trim();
  const planKey = inputPlanIdentity(input as CreateSubscriptionInput);
  const customerKey = inputCustomerIdentity(input as CreateSubscriptionInput);

  const candidates = store
    .listSubscriptionsByMerchant(input.merchantId)
    .filter((sub) => sub.status === "incomplete" && sameMode(sub, input.mode));

  const byRef = merchantRef
    ? candidates.filter((sub) => sub.merchantRef.trim() === merchantRef)
    : [];

  const byPlanCustomer =
    planKey && customerKey
      ? candidates.filter(
          (sub) => planIdentity(sub) === planKey && customerIdentity(sub) === customerKey,
        )
      : [];

  const pool = byRef.length > 0 ? byRef : byPlanCustomer;
  if (pool.length === 0) return null;

  pool.sort((a, b) => {
    const aOn = getOnChainSubscriptionId(a) ? 1 : 0;
    const bOn = getOnChainSubscriptionId(b) ? 1 : 0;
    if (aOn !== bOn) return bOn - aOn;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  return pool[0] ?? null;
}

function openInvoiceFor(store: BillingStore, subscriptionId: string): RecurringInvoice | null {
  const open = store
    .listInvoicesBySubscription(subscriptionId)
    .filter((inv) => inv.status === "open")
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return open[0] ?? null;
}

function ensureOpenInvoice(
  store: BillingStore,
  subscription: RecurringSubscription,
): { invoice: RecurringInvoice; events: BillingWebhookEvent[] } {
  const existing = openInvoiceFor(store, subscription.id);
  if (existing) return { invoice: existing, events: [] };

  const now = new Date();
  const invoice: RecurringInvoice = {
    id: newId("inv"),
    subscriptionId: subscription.id,
    merchantId: subscription.merchantId,
    status: "open",
    amountUsdc: subscription.amountUsdc,
    dueAt: now,
    attemptCount: 0,
    mode: subscription.mode,
    createdAt: now,
    updatedAt: now,
  };
  store.saveInvoice(invoice);
  return {
    invoice,
    events: [createWebhookEvent("invoice.created", { invoice })],
  };
}

function mergeMetadata(
  existing: Record<string, string> | undefined,
  incoming: Record<string, string> | undefined,
): Record<string, string> | undefined {
  if (!existing && !incoming) return undefined;
  return { ...(existing ?? {}), ...(incoming ?? {}) };
}

/**
 * Cancel other incomplete checkouts for the same merchantRef / plan+customer so only one stays open.
 */
export function cancelDuplicateIncompleteCheckouts(
  store: BillingStore,
  keepId: string,
  input: Pick<CreateSubscriptionInput, "merchantId" | "merchantRef" | "planId" | "metadata" | "walletAddress" | "mode">,
): BillingWebhookEvent[] {
  const keep = store.getSubscription(keepId);
  if (!keep) return [];

  const merchantRef = input.merchantRef.trim();
  const planKey = inputPlanIdentity(input as CreateSubscriptionInput);
  const customerKey = inputCustomerIdentity(input as CreateSubscriptionInput);
  const events: BillingWebhookEvent[] = [];

  for (const sub of store.listSubscriptionsByMerchant(input.merchantId)) {
    if (sub.id === keepId || sub.status !== "incomplete") continue;
    if (!sameMode(sub, input.mode)) continue;

    const sameRef = Boolean(merchantRef) && sub.merchantRef.trim() === merchantRef;
    const samePlanCustomer =
      Boolean(planKey) &&
      Boolean(customerKey) &&
      planIdentity(sub) === planKey &&
      customerIdentity(sub) === customerKey;
    if (!sameRef && !samePlanCustomer) continue;

    for (const inv of store.listInvoicesBySubscription(sub.id)) {
      if (inv.status !== "open") continue;
      const voided = voidInvoice(store, inv.id);
      if (voided) events.push(...voided.events);
    }
    const canceled = cancelSubscription(store, sub.id, true);
    if (canceled) events.push(...canceled.events);
  }

  return events;
}

export type CreateOrReuseSubscriptionResult = CreateSubscriptionResult & {
  reused: boolean;
};

/**
 * Resume an existing incomplete checkout when the same customer starts the same product again.
 * Otherwise create a new subscription.
 */
export function createOrReuseSubscription(
  store: BillingStore,
  input: CreateSubscriptionInput,
): CreateOrReuseSubscriptionResult {
  const existing = findReusableIncompleteSubscription(store, input);
  if (!existing) {
    const created = createSubscription(store, input);
    const dedupeEvents = cancelDuplicateIncompleteCheckouts(store, created.subscription.id, input);
    return { ...created, events: [...created.events, ...dedupeEvents], reused: false };
  }

  const now = new Date();
  const events: BillingWebhookEvent[] = [];

  let subscription: RecurringSubscription = {
    ...existing,
    merchantRef: input.merchantRef.trim() || existing.merchantRef,
    payoutAddressEvm: normalizeEvmAddress(input.payoutAddressEvm),
    amountUsdc: input.amountUsdc,
    interval: input.interval,
    planId: input.planId ?? existing.planId,
    metadata: mergeMetadata(existing.metadata, input.metadata),
    updatedAt: now,
  };
  store.saveSubscription(subscription);

  if (!isPendingCheckoutWallet(input.walletAddress)) {
    const updated = updateSubscriptionCustomerWallet(store, subscription.id, input.walletAddress);
    if (updated) subscription = updated;
  }

  const { invoice, events: invoiceEvents } = ensureOpenInvoice(store, subscription);
  events.push(...invoiceEvents);

  const mandate = subscription.mandateId ? store.getMandate(subscription.mandateId) : null;
  if (!mandate) {
    // Incomplete without mandate should not happen; fall through to a fresh create.
    const created = createSubscription(store, input);
    return { ...created, reused: false };
  }

  events.push(...cancelDuplicateIncompleteCheckouts(store, subscription.id, input));
  events.push(createWebhookEvent("subscription.updated", { subscription }));

  return {
    subscription,
    invoice,
    mandate,
    events,
    reused: true,
  };
}

export type ExpireIncompleteCheckoutsResult = {
  canceled: number;
  voidedInvoices: number;
  events: BillingWebhookEvent[];
};

/**
 * Cancel incomplete checkouts older than TTL and void their open invoices.
 * Stops abandoned sessions from being charged / emailed as "renewals".
 */
export function expireIncompleteCheckouts(
  store: BillingStore,
  options: { ttlMs?: number; now?: Date } = {},
): ExpireIncompleteCheckoutsResult {
  const ttlMs = options.ttlMs ?? DEFAULT_INCOMPLETE_CHECKOUT_TTL_MS;
  const now = options.now ?? new Date();
  const cutoff = now.getTime() - ttlMs;
  const events: BillingWebhookEvent[] = [];
  let canceled = 0;
  let voidedInvoices = 0;

  for (const sub of store.listAllSubscriptions()) {
    if (sub.status !== "incomplete") continue;
    if (sub.createdAt.getTime() > cutoff) continue;

    for (const inv of store.listInvoicesBySubscription(sub.id)) {
      if (inv.status !== "open") continue;
      const voided = voidInvoice(store, inv.id);
      if (voided) {
        voidedInvoices += 1;
        events.push(...voided.events);
      }
    }

    const result = cancelSubscription(store, sub.id, true);
    if (result) {
      canceled += 1;
      events.push(...result.events);
    }
  }

  return { canceled, voidedInvoices, events };
}
