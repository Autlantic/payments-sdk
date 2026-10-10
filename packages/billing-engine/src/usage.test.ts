import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createMemoryBillingStore } from "./memory-store";
import { createSubscription } from "./subscriptions";
import {
  aggregateUsageIntoInvoice,
  aggregateUsageQuantity,
  createMemoryUsageStore,
  createUsageRecord,
  usageAmountUsdc,
} from "./usage";

describe("aggregateUsageQuantity", () => {
  it("sums increments", () => {
    const q = aggregateUsageQuantity([
      {
        id: "1",
        merchantId: "m",
        subscriptionId: "s",
        quantity: 2,
        timestamp: new Date("2026-10-01T00:00:00.000Z"),
        action: "increment",
        createdAt: new Date(),
      },
      {
        id: "2",
        merchantId: "m",
        subscriptionId: "s",
        quantity: 3,
        timestamp: new Date("2026-10-02T00:00:00.000Z"),
        action: "increment",
        createdAt: new Date(),
      },
    ]);
    assert.equal(q, 5);
  });

  it("set replaces then increments add", () => {
    const q = aggregateUsageQuantity([
      {
        id: "1",
        merchantId: "m",
        subscriptionId: "s",
        quantity: 10,
        timestamp: new Date("2026-10-01T00:00:00.000Z"),
        action: "increment",
        createdAt: new Date(),
      },
      {
        id: "2",
        merchantId: "m",
        subscriptionId: "s",
        quantity: 4,
        timestamp: new Date("2026-10-02T00:00:00.000Z"),
        action: "set",
        createdAt: new Date(),
      },
      {
        id: "3",
        merchantId: "m",
        subscriptionId: "s",
        quantity: 1,
        timestamp: new Date("2026-10-03T00:00:00.000Z"),
        action: "increment",
        createdAt: new Date(),
      },
    ]);
    assert.equal(q, 5);
  });
});

describe("createUsageRecord + aggregateUsageIntoInvoice", () => {
  it("idempotent create and bills unbilled usage", () => {
    const billing = createMemoryBillingStore();
    const usage = createMemoryUsageStore();
    const created = createSubscription(billing, {
      merchantId: "m1",
      merchantRef: "ref-u",
      walletAddress: "0x1111111111111111111111111111111111111111",
      payoutAddressEvm: "0x2222222222222222222222222222222222222222",
      amountUsdc: 1,
      interval: "month",
      chainId: 8453,
      vaultAddress: "0x3333333333333333333333333333333333333333",
      mode: "live",
    });
    const sub = billing.getSubscription(created.subscription.id)!;
    billing.saveSubscription({ ...sub, status: "active" });

    const a = createUsageRecord(usage, {
      merchantId: "m1",
      subscriptionId: sub.id,
      quantity: 10,
      idempotencyKey: "evt-1",
      mode: "live",
    });
    const b = createUsageRecord(usage, {
      merchantId: "m1",
      subscriptionId: sub.id,
      quantity: 99,
      idempotencyKey: "evt-1",
      mode: "live",
    });
    assert.equal(b.reused, true);
    assert.equal(b.record.id, a.record.id);

    createUsageRecord(usage, {
      merchantId: "m1",
      subscriptionId: sub.id,
      quantity: 5,
      mode: "live",
    });

    assert.equal(usageAmountUsdc(15, 0.1), 1.5);

    const inv = aggregateUsageIntoInvoice(billing, usage, {
      subscriptionId: sub.id,
      unitAmountUsdc: 0.1,
    });
    assert.ok(inv);
    assert.equal(inv!.quantity, 15);
    assert.equal(inv!.amountUsdc, 1.5);
    assert.equal(usage.listUnbilledUsage(sub.id).length, 0);
  });
});
