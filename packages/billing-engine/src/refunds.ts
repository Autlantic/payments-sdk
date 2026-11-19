import {
  assertPositiveAmountUsdc,
  createWebhookEvent,
  type BillingInterval,
  type BillingWebhookEvent,
  type RecurringInvoice,
  type RecurringSubscription,
} from "@autlantic/payments-recurring-core";
import type { OneTimePayment } from "./one-time";
import type { BillingStore } from "./types";

export function updateSubscription(
  store: BillingStore,
  subscriptionId: string,
  input: {
    amountUsdc?: number;
    interval?: BillingInterval;
    intervalCount?: number;
    planId?: string;
    metadata?: Record<string, string>;
  },
): { subscription: RecurringSubscription; events: BillingWebhookEvent[] } | null {
  const subscription = store.getSubscription(subscriptionId);
  if (!subscription || subscription.status === "canceled") return null;

  if (input.amountUsdc !== undefined) {
    assertPositiveAmountUsdc(input.amountUsdc);
  }

  const now = new Date();
  const updated: RecurringSubscription = {
    ...subscription,
    amountUsdc: input.amountUsdc ?? subscription.amountUsdc,
    interval: input.interval ?? subscription.interval,
    intervalCount:
      input.intervalCount !== undefined
        ? input.intervalCount
        : subscription.intervalCount,
    planId: input.planId ?? subscription.planId,
    metadata: input.metadata ? { ...subscription.metadata, ...input.metadata } : subscription.metadata,
    updatedAt: now,
  };

  store.saveSubscription(updated);

  return {
    subscription: updated,
    events: [createWebhookEvent("subscription.updated", { subscription: updated })],
  };
}

export function voidInvoice(
  store: BillingStore,
  invoiceId: string,
): { invoice: RecurringInvoice; events: BillingWebhookEvent[] } | null {
  const invoice = store.getInvoice(invoiceId);
  if (!invoice || invoice.status !== "open") return null;

  const now = new Date();
  const updated: RecurringInvoice = {
    ...invoice,
    status: "void",
    updatedAt: now,
  };

  store.saveInvoice(updated);

  return {
    invoice: updated,
    events: [createWebhookEvent("invoice.voided", { invoice: updated })],
  };
}

export function refundInvoice(
  store: BillingStore,
  invoiceId: string,
  input: { refundTxHash?: string; refundAmountUsdc?: number; sandbox?: boolean } = {},
): { invoice: RecurringInvoice; events: BillingWebhookEvent[] } | null {
  const invoice = store.getInvoice(invoiceId);
  if (!invoice || invoice.status !== "paid") return null;

  const subscription = store.getSubscription(invoice.subscriptionId);
  if (!subscription) return null;

  const now = new Date();
  const refundAmount = input.refundAmountUsdc ?? invoice.amountUsdc;
  const updated: RecurringInvoice = {
    ...invoice,
    status: "refunded",
    refundAmountUsdc: refundAmount,
    refundTxHash: input.sandbox
      ? `0xrefund_${invoice.id.slice(0, 20)}`
      : input.refundTxHash,
    refundedAt: now,
    updatedAt: now,
  };

  store.saveInvoice(updated);

  return {
    invoice: updated,
    events: [
      createWebhookEvent("invoice.refunded", {
        invoice: updated,
        subscription,
        refundAmountUsdc: refundAmount,
      }),
    ],
  };
}

/**
 * Ledger refund for a paid one-time payment (payment-link / POST /v1/payments).
 * Does not move USDC; optional refundTxHash when the merchant already sent funds back.
 */
export function refundOneTimePayment(
  store: BillingStore,
  paymentId: string,
  input: { refundTxHash?: string; refundAmountUsdc?: number; sandbox?: boolean } = {},
): { payment: OneTimePayment; events: BillingWebhookEvent[] } | null {
  const payment = store.getOneTimePayment(paymentId);
  if (!payment || payment.status !== "paid") return null;

  const now = new Date();
  const refundAmount = input.refundAmountUsdc ?? payment.amountUsdc;
  assertPositiveAmountUsdc(refundAmount);

  const updated: OneTimePayment = {
    ...payment,
    status: "refunded",
    refundAmountUsdc: refundAmount,
    refundTxHash: input.sandbox
      ? `0xrefund_${payment.id.slice(0, 20)}`
      : input.refundTxHash,
    refundedAt: now,
  };

  store.saveOneTimePayment(updated);

  return {
    payment: updated,
    events: [
      createWebhookEvent("payment.refunded", {
        payment: updated,
        refundAmountUsdc: refundAmount,
      }),
    ],
  };
}
