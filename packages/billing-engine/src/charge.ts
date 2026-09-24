import {
  createWebhookEvent,
  hasMoreAttempts,
  nextAttemptAtAfterFailure,
  shouldMarkPastDue,
  type BillingWebhookEvent,
  type InvoiceFailureCode,
  type RecurringInvoice,
  type RecurringSubscription,
} from "@autlantic/payments-recurring-core";
import { getOnChainSubscriptionId, isValidLiveChargeTxHash } from "./on-chain";
import { advanceSubscriptionPeriod } from "./subscriptions";
import type { BillingStore, ChargeInvoiceResult, SandboxChargeMode } from "./types";

function sandboxTxHash(invoiceId: string): string {
  const hex = Buffer.from(invoiceId).toString("hex").slice(0, 62).padEnd(62, "0");
  return `0x${hex}`;
}

export function attemptInvoiceCharge(
  store: BillingStore,
  invoiceId: string,
  options: { sandbox?: boolean; sandboxMode?: SandboxChargeMode; txHash?: string } = {},
): ChargeInvoiceResult | null {
  const invoice = store.getInvoice(invoiceId);
  if (!invoice || invoice.status !== "open") return null;

  const subscription = store.getSubscription(invoice.subscriptionId);
  if (!subscription) return null;

  const mandate = subscription.mandateId
    ? store.getMandate(subscription.mandateId)
    : null;

  if (!mandate || mandate.status !== "active") {
    return failCharge(store, invoice, subscription, "MANDATE_INACTIVE", "Wallet mandate is not active");
  }

  if (invoice.amountUsdc === 0) {
    const now = new Date();
    const paidInvoice: RecurringInvoice = {
      ...invoice,
      status: "paid",
      attemptCount: invoice.attemptCount + 1,
      paidAt: now,
      txHash: sandboxTxHash(invoice.id),
      updatedAt: now,
    };
    // Initial checkout pays for the current period; only renewals advance it.
    let updatedSub =
      subscription.status === "incomplete"
        ? { ...subscription, status: "active" as const, updatedAt: now }
        : advanceSubscriptionPeriod(subscription);
    if (subscription.status === "past_due") {
      updatedSub = { ...updatedSub, status: "active" };
    }
    store.saveInvoice(paidInvoice);
    store.saveSubscription(updatedSub);
    return {
      ok: true,
      invoice: paidInvoice,
      subscription: updatedSub,
      events: [
        createWebhookEvent("invoice.paid", {
          invoice: paidInvoice,
          subscription: updatedSub,
        }),
      ],
    };
  }

  const sandbox = options.sandbox ?? true;
  const mode = options.sandboxMode ?? "success";

  if (sandbox && mode !== "success") {
    const code: InvoiceFailureCode =
      mode === "insufficient_balance" ? "INSUFFICIENT_BALANCE" : "ALLOWANCE_REVOKED";
    const message =
      mode === "insufficient_balance"
        ? "Wallet has insufficient USDC for this charge"
        : "USDC allowance was revoked or is too low";
    return failCharge(store, invoice, subscription, code, message);
  }

  if (!sandbox) {
    const txHash = options.txHash?.trim();
    if (!isValidLiveChargeTxHash(txHash)) {
      return failCharge(
        store,
        invoice,
        subscription,
        "RELAYER_ERROR",
        "Live charge requires an on-chain transaction hash",
      );
    }
  }

  const now = new Date();
  const paidInvoice: RecurringInvoice = {
    ...invoice,
    status: "paid",
    attemptCount: invoice.attemptCount + 1,
    paidAt: now,
    txHash: sandbox ? sandboxTxHash(invoice.id) : options.txHash,
    failureCode: undefined,
    failureMessage: undefined,
    updatedAt: now,
  };

  // Initial checkout pays for the current period; only renewals advance it.
  let updatedSub =
    subscription.status === "incomplete"
      ? { ...subscription, status: "active" as const, updatedAt: now }
      : advanceSubscriptionPeriod(subscription);
  if (subscription.status === "past_due") {
    updatedSub = { ...updatedSub, status: "active" };
  }
  if (updatedSub.cancelAtPeriodEnd && updatedSub.currentPeriodStart.getTime() >= subscription.currentPeriodEnd.getTime()) {
    updatedSub = {
      ...updatedSub,
      status: "canceled",
      canceledAt: now,
    };
  }

  store.saveInvoice(paidInvoice);
  store.saveSubscription(updatedSub);

  return {
    ok: true,
    invoice: paidInvoice,
    subscription: updatedSub,
    events: [
      createWebhookEvent("invoice.paid", {
        invoice: paidInvoice,
        subscription: updatedSub,
      }),
    ],
  };
}

function failCharge(
  store: BillingStore,
  invoice: RecurringInvoice,
  subscription: RecurringSubscription,
  code: InvoiceFailureCode,
  message: string,
): ChargeInvoiceResult {
  const now = new Date();
  const attemptCount = invoice.attemptCount + 1;
  const nextAttempt = nextAttemptAtAfterFailure(now, attemptCount);

  const failedInvoice: RecurringInvoice = {
    ...invoice,
    attemptCount,
    nextAttemptAt: nextAttempt ?? undefined,
    failureCode: code,
    failureMessage: message,
    updatedAt: now,
    status: shouldMarkPastDue(attemptCount) ? "uncollectible" : "open",
  };

  let updatedSub = subscription;
  const events: BillingWebhookEvent[] = [
    createWebhookEvent("invoice.payment_failed", {
      invoice: failedInvoice,
      subscription,
      failureCode: code,
      failureMessage: message,
    }),
  ];

  if (shouldMarkPastDue(attemptCount)) {
    updatedSub = {
      ...subscription,
      status: "past_due",
      updatedAt: now,
    };
    events.push(
      createWebhookEvent("subscription.past_due", { subscription: updatedSub }),
    );
  } else if (hasMoreAttempts(attemptCount)) {
    // keep subscription active during retry window
  }

  store.saveInvoice(failedInvoice);
  store.saveSubscription(updatedSub);

  return {
    ok: false,
    invoice: failedInvoice,
    subscription: updatedSub,
    events,
  };
}

export function processDueInvoices(
  store: BillingStore,
  until: Date,
  options: { sandbox?: boolean; mode?: "test" | "live" } = {},
): ChargeInvoiceResult[] {
  const due = store.listOpenInvoicesDueBefore(until);
  const results: ChargeInvoiceResult[] = [];

  for (const invoice of due) {
    if (options.mode) {
      const subscription = store.getSubscription(invoice.subscriptionId);
      const recordMode = invoice.mode ?? subscription?.mode ?? "test";
      if (recordMode !== options.mode) continue;
    }
    const result = attemptInvoiceCharge(store, invoice.id, options);
    if (result) results.push(result);
  }

  return results;
}

export type LiveChargeSubmitResult =
  | { ok: true; txHash: string }
  | { ok: false; error: string };

/** Process due invoices on-chain: relayer first, then mark paid with tx hash. */
export async function processDueInvoicesLive(
  store: BillingStore,
  until: Date,
  submitCharge: (input: {
    subscription: RecurringSubscription;
    invoice: RecurringInvoice;
    onChainSubscriptionId: string;
  }) => Promise<LiveChargeSubmitResult>,
  options: { mode?: "test" | "live" } = {},
): Promise<ChargeInvoiceResult[]> {
  const due = store.listOpenInvoicesDueBefore(until);
  const results: ChargeInvoiceResult[] = [];

  for (const invoice of due) {
    const subscription = store.getSubscription(invoice.subscriptionId);
    if (!subscription) continue;
    if (options.mode) {
      const recordMode = invoice.mode ?? subscription.mode ?? "test";
      if (recordMode !== options.mode) continue;
    }

    // Incomplete checkout waiting on vault.subscribe(): not a renewal. Do not
    // failCharge / webhook / email. processIncompleteFirstCharges handles the
    // first charge once onChainSubscriptionId exists; expireIncompleteCheckouts
    // cancels abandoned sessions after TTL.
    if (subscription.status === "incomplete" && !getOnChainSubscriptionId(subscription)) {
      continue;
    }

    const onChainSubscriptionId = getOnChainSubscriptionId(subscription);
    if (!onChainSubscriptionId) {
      results.push(
        failCharge(
          store,
          invoice,
          subscription,
          "RELAYER_ERROR",
          "Missing on-chain subscription id. Customer must call vault.subscribe() before charges.",
        ),
      );
      continue;
    }

    const relayer = await submitCharge({ subscription, invoice, onChainSubscriptionId });
    if (!relayer.ok) {
      results.push(
        failCharge(store, invoice, subscription, "RELAYER_ERROR", relayer.error),
      );
      continue;
    }

    const result = attemptInvoiceCharge(store, invoice.id, {
      sandbox: false,
      txHash: relayer.txHash,
    });
    if (result) results.push(result);
  }

  return results;
}
