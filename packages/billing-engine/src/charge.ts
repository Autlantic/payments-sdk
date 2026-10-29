import {
  createWebhookEvent,
  deferRetryAtFromOnChainPeriodEnd,
  hasMoreAttempts,
  isChargeNotDueFailure,
  nextAttemptAtAfterFailure,
  periodEndFromStart,
  shouldMarkPastDue,
  type BillingWebhookEvent,
  type InvoiceFailureCode,
  type RecurringInvoice,
  type RecurringSubscription,
} from "@autlantic/payments-recurring-core";
import { getOnChainSubscriptionId, isValidLiveChargeTxHash } from "./on-chain";
import { advanceSubscriptionPeriod } from "./subscriptions";
import type { BillingStore, ChargeInvoiceResult, SandboxChargeMode } from "./types";

/**
 * First successful charge: incomplete keeps the create-time period;
 * trialing starts a new paid period from now (trial window is over).
 */
function activatePaidPeriod(
  subscription: RecurringSubscription,
  now: Date,
): RecurringSubscription {
  if (subscription.status === "trialing") {
    return {
      ...subscription,
      status: "active",
      currentPeriodStart: now,
      currentPeriodEnd: periodEndFromStart(now, subscription.interval),
      updatedAt: now,
    };
  }
  return {
    ...subscription,
    status: "active",
    updatedAt: now,
  };
}

function sandboxTxHash(invoiceId: string): string {
  const hex = Buffer.from(invoiceId).toString("hex").slice(0, 62).padEnd(62, "0");
  return `0x${hex}`;
}

export type AttemptInvoiceChargeOptions = {
  sandbox?: boolean;
  sandboxMode?: SandboxChargeMode;
  txHash?: string;
  /**
   * Effective "now" for dueAt gating and paid period timestamps.
   * Hosts pass merchant test-clock time; default is wall clock.
   */
  now?: Date;
};

export function attemptInvoiceCharge(
  store: BillingStore,
  invoiceId: string,
  options: AttemptInvoiceChargeOptions = {},
): ChargeInvoiceResult | null {
  const invoice = store.getInvoice(invoiceId);
  if (!invoice || invoice.status !== "open") return null;

  const subscription = store.getSubscription(invoice.subscriptionId);
  if (!subscription) return null;

  // Canceled (and immediate store-offboard) must never renew or collect open invoices.
  if (subscription.status === "canceled") {
    return null;
  }

  const now = options.now ?? new Date();
  const nowMs = now.getTime();

  const mandate = subscription.mandateId
    ? store.getMandate(subscription.mandateId)
    : null;

  if (!mandate || mandate.status !== "active") {
    return failCharge(store, invoice, subscription, "MANDATE_INACTIVE", "Wallet mandate is not active", now);
  }

  // Trial / scheduled first invoice: do not charge before dueAt (no payment_failed).
  const dueAtMs = new Date(invoice.dueAt).getTime();
  if (Number.isFinite(dueAtMs) && dueAtMs > nowMs + 1000) {
    return null;
  }

  if (invoice.amountUsdc === 0) {
    const paidInvoice: RecurringInvoice = {
      ...invoice,
      status: "paid",
      attemptCount: invoice.attemptCount + 1,
      paidAt: now,
      txHash: sandboxTxHash(invoice.id),
      updatedAt: now,
    };
    // Initial checkout / trial conversion pays for the current period; renewals advance it.
    let updatedSub =
      subscription.status === "incomplete" || subscription.status === "trialing"
        ? activatePaidPeriod(subscription, now)
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
    return failCharge(store, invoice, subscription, code, message, now);
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
        now,
      );
    }
  }

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

  // Initial checkout / trial conversion pays for the current period; renewals advance it.
  let updatedSub =
    subscription.status === "incomplete" || subscription.status === "trialing"
      ? activatePaidPeriod(subscription, now)
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
  now: Date = new Date(),
): ChargeInvoiceResult {
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

/**
 * Quietly reschedule an open invoice until the vault period unlocks.
 * Does not increment attemptCount, does not emit payment_failed, does not past_due.
 * Aligns off-chain dueAt / currentPeriodEnd forward when on-chain periodEnd is later.
 */
export function deferInvoiceUntilOnChainDue(
  store: BillingStore,
  invoice: RecurringInvoice,
  subscription: RecurringSubscription,
  input: { retryAt: Date; onChainPeriodEndUnix?: number },
): ChargeInvoiceResult {
  const now = new Date();
  const periodEndMs =
    typeof input.onChainPeriodEndUnix === "number" && Number.isFinite(input.onChainPeriodEndUnix)
      ? input.onChainPeriodEndUnix * 1000
      : null;
  const alignedPeriodEnd =
    periodEndMs != null && periodEndMs > subscription.currentPeriodEnd.getTime()
      ? new Date(periodEndMs)
      : null;

  let updatedSub = subscription;
  if (alignedPeriodEnd) {
    updatedSub = {
      ...subscription,
      currentPeriodEnd: alignedPeriodEnd,
      updatedAt: now,
    };
    store.saveSubscription(updatedSub);
  }

  const deferredInvoice: RecurringInvoice = {
    ...invoice,
    dueAt: alignedPeriodEnd ?? invoice.dueAt,
    nextAttemptAt: input.retryAt,
    // Clear any prior failure stamp from older buggy workers; this is not a failure.
    failureCode: undefined,
    failureMessage: undefined,
    updatedAt: now,
    status: "open",
  };
  store.saveInvoice(deferredInvoice);

  return {
    ok: false,
    deferred: true,
    invoice: deferredInvoice,
    subscription: updatedSub,
    events: [],
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
    const subscription = store.getSubscription(invoice.subscriptionId);
    if (!subscription || subscription.status === "canceled") continue;
    if (options.mode) {
      const recordMode = invoice.mode ?? subscription.mode ?? "test";
      if (recordMode !== options.mode) continue;
    }
    const result = attemptInvoiceCharge(store, invoice.id, options);
    if (result) results.push(result);
  }

  return results;
}

export type LiveChargeSubmitResult =
  | { ok: true; txHash: string }
  | {
      ok: false;
      /** Quiet defer until vault periodEnd. Prefer over failCharge for CHARGE_NOT_DUE. */
      defer: true;
      retryAt: Date;
      onChainPeriodEndUnix?: number;
    }
  | { ok: false; error: string; code?: InvoiceFailureCode };

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
    if (!subscription || subscription.status === "canceled") continue;
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
      if ("defer" in relayer && relayer.defer) {
        results.push(
          deferInvoiceUntilOnChainDue(store, invoice, subscription, {
            retryAt: relayer.retryAt,
            onChainPeriodEndUnix: relayer.onChainPeriodEndUnix,
          }),
        );
        continue;
      }
      const error = "error" in relayer ? relayer.error : "Relayer charge failed";
      const code =
        "code" in relayer && relayer.code
          ? relayer.code
          : isChargeNotDueFailure({ message: error })
            ? "CHARGE_NOT_DUE"
            : "RELAYER_ERROR";
      // Host forgot defer shape but returned not-due text: still quiet-defer.
      if (code === "CHARGE_NOT_DUE" || isChargeNotDueFailure({ code, message: error })) {
        const periodEndUnix = Math.floor(until.getTime() / 1000) + 60;
        results.push(
          deferInvoiceUntilOnChainDue(store, invoice, subscription, {
            retryAt: deferRetryAtFromOnChainPeriodEnd(periodEndUnix, {
              nowMs: until.getTime(),
            }),
            onChainPeriodEndUnix: periodEndUnix,
          }),
        );
        continue;
      }
      results.push(failCharge(store, invoice, subscription, code, error));
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
