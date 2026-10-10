/**
 * Subscription plan-change proration (Phase 4).
 * Credit unused time on the old plan; charge remaining time on the new plan.
 */

import {
  assertPositiveAmountUsdc,
  createWebhookEvent,
  type BillingInterval,
  type BillingWebhookEvent,
  type RecurringInvoice,
  type RecurringSubscription,
} from "@autlantic/payments-recurring-core";
import { newId } from "./id";
import type { BillingStore } from "./types";
import { updateSubscription } from "./refunds";

export type ProrationPreview = {
  unusedSeconds: number;
  periodSeconds: number;
  creditUsdc: number;
  chargeUsdc: number;
  /** Net amount due now (charge - credit), floored at 0. */
  amountDueUsdc: number;
  /** Unused credit leftover when credit > charge (applied as invoice credit metadata). */
  leftoverCreditUsdc: number;
};

function clamp01(n: number): number {
  if (!Number.isFinite(n) || n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

function roundUsdc(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}

/**
 * Preview proration between old and new recurring amounts for the current period.
 * Uses wall-clock remaining fraction of [periodStart, periodEnd].
 */
export function previewPlanChangeProration(input: {
  currentAmountUsdc: number;
  newAmountUsdc: number;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  now?: Date;
}): ProrationPreview {
  const now = input.now ?? new Date();
  const start = input.currentPeriodStart.getTime();
  const end = input.currentPeriodEnd.getTime();
  const periodSeconds = Math.max(0, Math.floor((end - start) / 1000));
  const unusedSeconds = Math.max(0, Math.floor((end - now.getTime()) / 1000));
  const remainingFraction =
    periodSeconds <= 0 ? 0 : clamp01(unusedSeconds / periodSeconds);

  const creditUsdc = roundUsdc(input.currentAmountUsdc * remainingFraction);
  const chargeUsdc = roundUsdc(input.newAmountUsdc * remainingFraction);
  const net = roundUsdc(chargeUsdc - creditUsdc);
  const amountDueUsdc = Math.max(0, net);
  const leftoverCreditUsdc = Math.max(0, roundUsdc(creditUsdc - chargeUsdc));

  return {
    unusedSeconds,
    periodSeconds,
    creditUsdc,
    chargeUsdc,
    amountDueUsdc,
    leftoverCreditUsdc,
  };
}

export type ChangeSubscriptionPlanInput = {
  subscriptionId: string;
  newAmountUsdc: number;
  newInterval?: BillingInterval;
  newPlanId?: string;
  /** When true (default), create an immediate open proration invoice if amountDue > 0. */
  createProrationInvoice?: boolean;
  metadata?: Record<string, string>;
  now?: Date;
};

export type ChangeSubscriptionPlanResult = {
  subscription: RecurringSubscription;
  proration: ProrationPreview;
  invoice: RecurringInvoice | null;
  events: BillingWebhookEvent[];
};

/**
 * Change a subscription's plan mid-cycle with proration.
 * Does not charge on-chain; creates an open invoice when net due > 0.
 */
export function changeSubscriptionPlan(
  store: BillingStore,
  input: ChangeSubscriptionPlanInput,
): ChangeSubscriptionPlanResult | null {
  const subscription = store.getSubscription(input.subscriptionId);
  if (!subscription || subscription.status === "canceled") return null;

  assertPositiveAmountUsdc(input.newAmountUsdc);
  const now = input.now ?? new Date();
  const proration = previewPlanChangeProration({
    currentAmountUsdc: subscription.amountUsdc,
    newAmountUsdc: input.newAmountUsdc,
    currentPeriodStart: subscription.currentPeriodStart,
    currentPeriodEnd: subscription.currentPeriodEnd,
    now,
  });

  const updated = updateSubscription(store, subscription.id, {
    amountUsdc: input.newAmountUsdc,
    interval: input.newInterval,
    planId: input.newPlanId,
    metadata: {
      ...(input.metadata ?? {}),
      lastProrationCreditUsdc: String(proration.creditUsdc),
      lastProrationChargeUsdc: String(proration.chargeUsdc),
      lastProrationAmountDueUsdc: String(proration.amountDueUsdc),
    },
  });
  if (!updated) return null;

  const events: BillingWebhookEvent[] = [...updated.events];
  let invoice: RecurringInvoice | null = null;
  const shouldInvoice = input.createProrationInvoice !== false && proration.amountDueUsdc > 0;

  if (shouldInvoice) {
    invoice = {
      id: newId("inv"),
      subscriptionId: updated.subscription.id,
      merchantId: updated.subscription.merchantId,
      status: "open",
      amountUsdc: proration.amountDueUsdc,
      dueAt: now,
      attemptCount: 0,
      nextAttemptAt: now,
      mode: updated.subscription.mode,
      createdAt: now,
      updatedAt: now,
    };
    store.saveInvoice(invoice);
    events.push(
      createWebhookEvent("invoice.created", {
        invoice,
        subscription: updated.subscription,
        reason: "proration",
      }),
    );
  }

  events.push(
    createWebhookEvent("subscription.updated", {
      subscription: updated.subscription,
      reason: "plan_change",
      proration,
    }),
  );

  return {
    subscription: updated.subscription,
    proration,
    invoice,
    events,
  };
}
