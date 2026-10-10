/**
 * Metered usage records + aggregation (Phase 5).
 * Pure store helpers; hosting persists via Prisma and calls these for invoice math.
 */

import { createWebhookEvent, type BillingWebhookEvent, type RecurringInvoice } from "@autlantic/payments-recurring-core";
import { newId } from "./id";
import type { BillingStore } from "./types";

export type UsageAction = "increment" | "set";

export type UsageRecord = {
  id: string;
  merchantId: string;
  subscriptionId: string;
  priceId?: string;
  quantity: number;
  timestamp: Date;
  idempotencyKey?: string;
  action: UsageAction;
  metadata?: Record<string, string>;
  mode?: "test" | "live";
  /** When set, this record has been rolled into an invoice. */
  invoiceId?: string;
  createdAt: Date;
};

export type UsageStore = {
  saveUsageRecord(record: UsageRecord): void;
  getUsageRecord(id: string): UsageRecord | null;
  findUsageByIdempotencyKey(merchantId: string, key: string): UsageRecord | null;
  listUnbilledUsage(subscriptionId: string): UsageRecord[];
  markUsageInvoiced(ids: string[], invoiceId: string): void;
};

export type CreateUsageRecordInput = {
  merchantId: string;
  subscriptionId: string;
  quantity: number;
  priceId?: string;
  timestamp?: Date;
  idempotencyKey?: string;
  action?: UsageAction;
  metadata?: Record<string, string>;
  mode?: "test" | "live";
};

export function createUsageRecord(
  usageStore: UsageStore,
  input: CreateUsageRecordInput,
): { record: UsageRecord; reused: boolean } {
  if (!Number.isFinite(input.quantity) || input.quantity < 0) {
    throw new Error("quantity must be a non-negative number");
  }
  if (input.idempotencyKey?.trim()) {
    const existing = usageStore.findUsageByIdempotencyKey(
      input.merchantId,
      input.idempotencyKey.trim(),
    );
    if (existing) return { record: existing, reused: true };
  }

  const now = new Date();
  const record: UsageRecord = {
    id: newId("usage"),
    merchantId: input.merchantId,
    subscriptionId: input.subscriptionId,
    priceId: input.priceId,
    quantity: input.quantity,
    timestamp: input.timestamp ?? now,
    idempotencyKey: input.idempotencyKey?.trim() || undefined,
    action: input.action ?? "increment",
    metadata: input.metadata,
    mode: input.mode,
    createdAt: now,
  };
  usageStore.saveUsageRecord(record);
  return { record, reused: false };
}

/**
 * Aggregate unbilled usage into a total quantity.
 * `set` actions replace the running total; `increment` adds.
 */
export function aggregateUsageQuantity(records: UsageRecord[]): number {
  const sorted = [...records].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  let total = 0;
  for (const r of sorted) {
    if (r.action === "set") total = r.quantity;
    else total += r.quantity;
  }
  return Math.round(total * 1e6) / 1e6;
}

export function usageAmountUsdc(quantity: number, unitAmountUsdc: number): number {
  return Math.round(quantity * unitAmountUsdc * 1e6) / 1e6;
}

export type AggregateUsageIntoInvoiceResult = {
  invoice: RecurringInvoice;
  quantity: number;
  amountUsdc: number;
  recordIds: string[];
  events: BillingWebhookEvent[];
};

/**
 * Create an open invoice from unbilled usage for a subscription.
 * Caller supplies unit price (from metered catalog price).
 */
export function aggregateUsageIntoInvoice(
  billingStore: BillingStore,
  usageStore: UsageStore,
  input: {
    subscriptionId: string;
    unitAmountUsdc: number;
    dueAt?: Date;
  },
): AggregateUsageIntoInvoiceResult | null {
  const subscription = billingStore.getSubscription(input.subscriptionId);
  if (!subscription || subscription.status === "canceled") return null;

  const unbilled = usageStore.listUnbilledUsage(subscription.id);
  if (unbilled.length === 0) return null;

  const quantity = aggregateUsageQuantity(unbilled);
  const amountUsdc = usageAmountUsdc(quantity, input.unitAmountUsdc);
  if (amountUsdc <= 0) return null;

  const now = new Date();
  const invoice: RecurringInvoice = {
    id: newId("inv"),
    subscriptionId: subscription.id,
    merchantId: subscription.merchantId,
    status: "open",
    amountUsdc,
    dueAt: input.dueAt ?? now,
    attemptCount: 0,
    nextAttemptAt: input.dueAt ?? now,
    mode: subscription.mode,
    createdAt: now,
    updatedAt: now,
  };
  billingStore.saveInvoice(invoice);
  const recordIds = unbilled.map((r) => r.id);
  usageStore.markUsageInvoiced(recordIds, invoice.id);

  const events = [
    createWebhookEvent("invoice.created", {
      invoice,
      subscription,
      reason: "metered_usage",
      quantity,
    }),
  ];

  return { invoice, quantity, amountUsdc, recordIds, events };
}

/** In-memory usage store for tests. */
export function createMemoryUsageStore(): UsageStore {
  const byId = new Map<string, UsageRecord>();
  const byIdem = new Map<string, string>();

  return {
    saveUsageRecord(record) {
      byId.set(record.id, record);
      if (record.idempotencyKey) {
        byIdem.set(`${record.merchantId}:${record.idempotencyKey}`, record.id);
      }
    },
    getUsageRecord(id) {
      return byId.get(id) ?? null;
    },
    findUsageByIdempotencyKey(merchantId, key) {
      const id = byIdem.get(`${merchantId}:${key}`);
      return id ? byId.get(id) ?? null : null;
    },
    listUnbilledUsage(subscriptionId) {
      return [...byId.values()].filter(
        (r) => r.subscriptionId === subscriptionId && !r.invoiceId,
      );
    },
    markUsageInvoiced(ids, invoiceId) {
      for (const id of ids) {
        const r = byId.get(id);
        if (r) byId.set(id, { ...r, invoiceId });
      }
    },
  };
}
