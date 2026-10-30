import {
  createWebhookEvent,
  defaultAllowanceCapUsdc,
  nextPeriodEnd,
  normalizeTrialDays,
  periodEndFromStart,
  trialEndFromStart,
  assertPositiveAmountUsdc,
  normalizeEvmAddress,
  type BillingWebhookEvent,
  type CreateSubscriptionInput,
  type RecurringCustomer,
  type RecurringInvoice,
  type RecurringMandate,
  type RecurringSubscription,
} from "@autlantic/payments-recurring-core";
import { newId } from "./id";
import type { BillingStore, CreateSubscriptionResult } from "./types";

export function createSubscription(
  store: BillingStore,
  input: CreateSubscriptionInput,
): CreateSubscriptionResult {
  assertPositiveAmountUsdc(input.amountUsdc);
  const walletAddress = normalizeEvmAddress(input.walletAddress);
  const payoutAddressEvm = normalizeEvmAddress(input.payoutAddressEvm);
  const vaultAddress = normalizeEvmAddress(input.vaultAddress);

  const now = new Date();
  const customerId = newId("cus");
  const subscriptionId = newId("sub");
  const mandateId = newId("mdt");
  const invoiceId = newId("inv");
  const trialDays = normalizeTrialDays(input.trialDays);
  const onTrial = trialDays > 0;

  const allowanceCapUsdc =
    input.allowanceCapUsdc ?? defaultAllowanceCapUsdc(input.amountUsdc, input.interval);
  const maxChargeUsdc = input.maxChargeUsdc ?? input.amountUsdc;

  const customer: RecurringCustomer = {
    id: customerId,
    merchantId: input.merchantId,
    walletAddress,
    mode: input.mode,
  };

  const periodStart = now;
  const trialEnd = trialEndFromStart(periodStart, trialDays);
  const periodEnd = onTrial ? trialEnd : periodEndFromStart(periodStart, input.interval);

  const mandate: RecurringMandate = {
    id: mandateId,
    subscriptionId,
    walletAddress,
    spenderAddress: vaultAddress,
    chainId: input.chainId,
    allowanceCapUsdc,
    maxChargeUsdc,
    status: "pending",
    createdAt: now,
  };

  const subscription: RecurringSubscription = {
    id: subscriptionId,
    merchantId: input.merchantId,
    merchantRef: input.merchantRef,
    customerId,
    planId: input.planId,
    payoutAddressEvm,
    walletAddress,
    amountUsdc: input.amountUsdc,
    interval: input.interval,
    chainId: input.chainId,
    status: onTrial ? "trialing" : "incomplete",
    mandateId,
    currentPeriodStart: periodStart,
    currentPeriodEnd: periodEnd,
    cancelAtPeriodEnd: false,
    metadata: input.metadata,
    mode: input.mode,
    createdAt: now,
    updatedAt: now,
  };

  const invoice: RecurringInvoice = {
    id: invoiceId,
    subscriptionId,
    merchantId: input.merchantId,
    status: "open",
    amountUsdc: input.amountUsdc,
    dueAt: onTrial ? trialEnd : now,
    attemptCount: 0,
    mode: input.mode,
    createdAt: now,
    updatedAt: now,
  };

  store.saveCustomer(customer);
  store.saveSubscription(subscription);
  store.saveMandate(mandate);
  store.saveInvoice(invoice);

  const events = [
    createWebhookEvent("subscription.created", { subscription }),
    createWebhookEvent("invoice.created", { invoice }),
  ];

  return { subscription, invoice, mandate, events };
}

export function completeMandate(
  store: BillingStore,
  subscriptionId: string,
): { subscription: RecurringSubscription; mandate: RecurringMandate; events: BillingWebhookEvent[] } | null {
  const subscription = store.getSubscription(subscriptionId);
  if (!subscription?.mandateId) return null;

  const mandate = store.getMandate(subscription.mandateId);
  if (!mandate || mandate.status !== "pending") return null;

  const now = new Date();
  const updatedMandate: RecurringMandate = {
    ...mandate,
    status: "active",
    activatedAt: now,
  };

  const updatedSub: RecurringSubscription = {
    ...subscription,
    updatedAt: now,
  };

  store.saveMandate(updatedMandate);
  store.saveSubscription(updatedSub);

  return {
    subscription: updatedSub,
    mandate: updatedMandate,
    events: [
      createWebhookEvent("subscription.activated", {
        subscription: updatedSub,
        mandate: updatedMandate,
      }),
    ],
  };
}

function voidOpenInvoicesForSubscription(
  store: BillingStore,
  subscriptionId: string,
  now: Date,
  events: BillingWebhookEvent[],
): void {
  for (const invoice of store.listInvoicesBySubscription(subscriptionId)) {
    if (invoice.status !== "open") continue;
    const voided: RecurringInvoice = {
      ...invoice,
      status: "void",
      updatedAt: now,
    };
    store.saveInvoice(voided);
    events.push(createWebhookEvent("invoice.voided", { invoice: voided }));
  }
}

/** Recreate the trial conversion invoice after resume voids were applied. */
function ensureTrialConversionInvoice(
  store: BillingStore,
  subscription: RecurringSubscription,
  now: Date,
): RecurringInvoice | null {
  if (subscription.status !== "trialing") return null;
  const hasOpen = store
    .listInvoicesBySubscription(subscription.id)
    .some((invoice) => invoice.status === "open");
  if (hasOpen) return null;

  const invoice: RecurringInvoice = {
    id: newId("inv"),
    subscriptionId: subscription.id,
    merchantId: subscription.merchantId,
    status: "open",
    amountUsdc: subscription.amountUsdc,
    dueAt: subscription.currentPeriodEnd,
    attemptCount: 0,
    mode: subscription.mode,
    createdAt: now,
    updatedAt: now,
  };
  store.saveInvoice(invoice);
  return invoice;
}

export function cancelSubscription(
  store: BillingStore,
  subscriptionId: string,
  immediate = false,
): { subscription: RecurringSubscription; events: BillingWebhookEvent[] } | null {
  const subscription = store.getSubscription(subscriptionId);
  if (!subscription || subscription.status === "canceled") return null;

  const now = new Date();
  const updated: RecurringSubscription = immediate
    ? {
        ...subscription,
        status: "canceled",
        cancelAtPeriodEnd: false,
        canceledAt: now,
        updatedAt: now,
      }
    : {
        ...subscription,
        cancelAtPeriodEnd: true,
        updatedAt: now,
      };

  store.saveSubscription(updated);

  const events: BillingWebhookEvent[] = [
    createWebhookEvent("subscription.canceled", { subscription: updated }),
  ];

  // Immediate cancel must not leave open invoices chargeable by the worker.
  // Period-end cancel during trial voids the conversion invoice so trial end
  // does not charge; access continues until currentPeriodEnd (trial end).
  if (immediate || subscription.status === "trialing") {
    voidOpenInvoicesForSubscription(store, subscriptionId, now, events);
  }

  return { subscription: updated, events };
}

/**
 * Flip cancel-at-period-end subscriptions to canceled once the period has ended
 * (including trials that voided their conversion invoice and never charged).
 */
export function finalizeCancelAtPeriodEnd(
  store: BillingStore,
  now: Date = new Date(),
): { subscriptions: RecurringSubscription[]; events: BillingWebhookEvent[] } {
  const subscriptions: RecurringSubscription[] = [];
  const events: BillingWebhookEvent[] = [];
  const nowMs = now.getTime();

  for (const subscription of store.listAllSubscriptions()) {
    if (subscription.status === "canceled") continue;
    if (!subscription.cancelAtPeriodEnd) continue;
    if (subscription.currentPeriodEnd.getTime() > nowMs) continue;

    const updated: RecurringSubscription = {
      ...subscription,
      status: "canceled",
      cancelAtPeriodEnd: false,
      canceledAt: now,
      updatedAt: now,
    };
    store.saveSubscription(updated);
    voidOpenInvoicesForSubscription(store, subscription.id, now, events);
    events.push(createWebhookEvent("subscription.canceled", { subscription: updated }));
    subscriptions.push(updated);
  }

  return { subscriptions, events };
}

const DEFAULT_CANCEL_MATCH_STATUSES = new Set([
  "active",
  "past_due",
  "incomplete",
  "trialing",
]);

export type CancelSubscriptionsMatchingInput = {
  merchantId: string;
  /** Required metadata.creatorId match (Autlantic creator / store id). */
  creatorId: string;
  /** When set, only these metadata.billingKind values are canceled. */
  billingKinds?: string[];
  /** Default true for forced store offboarding. */
  immediate?: boolean;
  /** Stored on subscription metadata as cancelReason when provided. */
  reason?: string;
  /** Default: active, past_due, incomplete. */
  statuses?: string[];
};

export type CancelSubscriptionsMatchingItem = {
  id: string;
  priorStatus: string;
  status: string;
};

export type CancelSubscriptionsMatchingResult = {
  canceled: CancelSubscriptionsMatchingItem[];
  alreadyTerminal: CancelSubscriptionsMatchingItem[];
  failed: Array<{ id: string; error: string }>;
  events: BillingWebhookEvent[];
};

/**
 * Merchant-scoped bulk cancel by metadata.creatorId (and optional billingKind).
 * Idempotent: already-canceled rows land in alreadyTerminal.
 */
export function cancelSubscriptionsMatching(
  store: BillingStore,
  input: CancelSubscriptionsMatchingInput,
): CancelSubscriptionsMatchingResult {
  const creatorId = input.creatorId.trim();
  if (!creatorId) {
    return { canceled: [], alreadyTerminal: [], failed: [], events: [] };
  }

  const immediate = input.immediate !== false;
  const kindAllow =
    input.billingKinds && input.billingKinds.length > 0
      ? new Set(input.billingKinds.map((k) => k.trim()).filter(Boolean))
      : null;
  const statusAllow = new Set(
    (input.statuses?.length ? input.statuses : [...DEFAULT_CANCEL_MATCH_STATUSES]).map((s) =>
      s.trim(),
    ),
  );
  const reason = input.reason?.trim() || undefined;

  const canceled: CancelSubscriptionsMatchingItem[] = [];
  const alreadyTerminal: CancelSubscriptionsMatchingItem[] = [];
  const failed: Array<{ id: string; error: string }> = [];
  const events: BillingWebhookEvent[] = [];

  const candidates = store
    .listSubscriptionsByMerchant(input.merchantId)
    .filter((sub) => sub.metadata?.creatorId === creatorId)
    .filter((sub) => {
      if (!kindAllow) return true;
      const kind = sub.metadata?.billingKind?.trim() ?? "";
      return kindAllow.has(kind);
    });

  for (const sub of candidates) {
    if (sub.status === "canceled") {
      alreadyTerminal.push({
        id: sub.id,
        priorStatus: sub.status,
        status: sub.status,
      });
      continue;
    }

    if (!statusAllow.has(sub.status)) {
      continue;
    }

    // Already scheduled to end and caller asked for period-end cancel: terminal enough.
    if (!immediate && sub.cancelAtPeriodEnd) {
      alreadyTerminal.push({
        id: sub.id,
        priorStatus: sub.status,
        status: sub.status,
      });
      continue;
    }

    try {
      if (reason) {
        const withReason: RecurringSubscription = {
          ...sub,
          metadata: { ...sub.metadata, cancelReason: reason },
          updatedAt: new Date(),
        };
        store.saveSubscription(withReason);
      }
      const result = cancelSubscription(store, sub.id, immediate);
      if (!result) {
        const latest = store.getSubscription(sub.id);
        if (latest?.status === "canceled") {
          alreadyTerminal.push({
            id: sub.id,
            priorStatus: sub.status,
            status: "canceled",
          });
        } else {
          failed.push({ id: sub.id, error: "cancel_failed" });
        }
        continue;
      }
      events.push(...result.events);
      canceled.push({
        id: result.subscription.id,
        priorStatus: sub.status,
        status: result.subscription.status,
      });
    } catch (e) {
      failed.push({
        id: sub.id,
        error: e instanceof Error ? e.message : "cancel_failed",
      });
    }
  }

  return { canceled, alreadyTerminal, failed, events };
}

/** Clear cancel-at-period-end so renewals resume. */
export function resumeSubscription(
  store: BillingStore,
  subscriptionId: string,
): { subscription: RecurringSubscription; events: BillingWebhookEvent[] } | null {
  const subscription = store.getSubscription(subscriptionId);
  if (!subscription || subscription.status === "canceled") return null;
  if (!subscription.cancelAtPeriodEnd) return null;

  const now = new Date();
  const updated: RecurringSubscription = {
    ...subscription,
    cancelAtPeriodEnd: false,
    updatedAt: now,
  };
  store.saveSubscription(updated);

  const events: BillingWebhookEvent[] = [
    createWebhookEvent("subscription.updated", { subscription: updated }),
  ];

  // Trial cancel-at-period-end voids the conversion invoice; restore it on resume.
  const restoredInvoice = ensureTrialConversionInvoice(store, updated, now);
  if (restoredInvoice) {
    events.push(
      createWebhookEvent("invoice.created", {
        invoice: restoredInvoice,
        subscription: updated,
      }),
    );
  }

  return { subscription: updated, events };
}

export function createRenewalInvoice(
  store: BillingStore,
  subscriptionId: string,
): RecurringInvoice | null {
  const subscription = store.getSubscription(subscriptionId);
  if (!subscription || subscription.status !== "active") return null;
  if (subscription.cancelAtPeriodEnd) return null;

  const now = new Date();
  const invoice: RecurringInvoice = {
    id: newId("inv"),
    subscriptionId,
    merchantId: subscription.merchantId,
    status: "open",
    amountUsdc: subscription.amountUsdc,
    dueAt: subscription.currentPeriodEnd,
    attemptCount: 0,
    mode: subscription.mode,
    createdAt: now,
    updatedAt: now,
  };

  store.saveInvoice(invoice);
  return invoice;
}

/** Create renewal invoice and return webhook event for dispatch. */
export function createRenewalInvoiceWithEvent(
  store: BillingStore,
  subscriptionId: string,
): { invoice: RecurringInvoice; events: BillingWebhookEvent[] } | null {
  const subscription = store.getSubscription(subscriptionId);
  if (!subscription) return null;

  const invoice = createRenewalInvoice(store, subscriptionId);
  if (!invoice) return null;

  return {
    invoice,
    events: [createWebhookEvent("invoice.created", { invoice, subscription })],
  };
}

export function advanceSubscriptionPeriod(
  subscription: RecurringSubscription,
): RecurringSubscription {
  const nextEnd = nextPeriodEnd(subscription.currentPeriodEnd, subscription.interval);
  return {
    ...subscription,
    currentPeriodStart: subscription.currentPeriodEnd,
    currentPeriodEnd: nextEnd,
    updatedAt: new Date(),
  };
}

/**
 * Update customer wallet while checkout is still awaiting activation.
 * Allows `incomplete`, and `trialing` while the mandate is still pending
 * (trials create as trialing before mandate complete).
 */
export function updateSubscriptionCustomerWallet(
  store: BillingStore,
  subscriptionId: string,
  walletAddress: string,
): RecurringSubscription | null {
  const subscription = store.getSubscription(subscriptionId);
  if (!subscription) return null;

  const mandate = subscription.mandateId ? store.getMandate(subscription.mandateId) : null;
  const awaitingActivation =
    subscription.status === "incomplete" ||
    (subscription.status === "trialing" && (!mandate || mandate.status === "pending"));
  if (!awaitingActivation) return null;

  const normalized = normalizeEvmAddress(walletAddress);
  const now = new Date();

  const customer = store.getCustomer(subscription.customerId);
  if (customer) {
    store.saveCustomer({ ...customer, walletAddress: normalized });
  }

  if (mandate && mandate.status === "pending") {
    store.saveMandate({ ...mandate, walletAddress: normalized });
  }

  const updated: RecurringSubscription = {
    ...subscription,
    walletAddress: normalized,
    updatedAt: now,
  };
  store.saveSubscription(updated);
  return updated;
}
