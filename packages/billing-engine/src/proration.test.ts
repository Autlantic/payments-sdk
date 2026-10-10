import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createMemoryBillingStore } from "./memory-store";
import { createSubscription } from "./subscriptions";
import { changeSubscriptionPlan, previewPlanChangeProration } from "./proration";

describe("previewPlanChangeProration", () => {
  it("credits half period when halfway through", () => {
    const start = new Date("2026-10-01T00:00:00.000Z");
    const end = new Date("2026-10-31T00:00:00.000Z");
    const mid = new Date("2026-10-16T00:00:00.000Z");
    const preview = previewPlanChangeProration({
      currentAmountUsdc: 100,
      newAmountUsdc: 200,
      currentPeriodStart: start,
      currentPeriodEnd: end,
      now: mid,
    });
    assert.ok(preview.creditUsdc > 40 && preview.creditUsdc < 60);
    assert.ok(preview.chargeUsdc > 80 && preview.chargeUsdc < 120);
    assert.equal(preview.amountDueUsdc, preview.chargeUsdc - preview.creditUsdc);
  });

  it("floors amount due at zero on downgrade", () => {
    const start = new Date("2026-10-01T00:00:00.000Z");
    const end = new Date("2026-11-01T00:00:00.000Z");
    const mid = new Date("2026-10-16T00:00:00.000Z");
    const preview = previewPlanChangeProration({
      currentAmountUsdc: 100,
      newAmountUsdc: 40,
      currentPeriodStart: start,
      currentPeriodEnd: end,
      now: mid,
    });
    assert.equal(preview.amountDueUsdc, 0);
    assert.ok(preview.leftoverCreditUsdc > 0);
  });
});

describe("changeSubscriptionPlan", () => {
  it("updates amount and creates proration invoice on upgrade", () => {
    const store = createMemoryBillingStore();
    const created = createSubscription(store, {
      merchantId: "m1",
      merchantRef: "ref-1",
      walletAddress: "0x1111111111111111111111111111111111111111",
      payoutAddressEvm: "0x2222222222222222222222222222222222222222",
      amountUsdc: 49,
      interval: "month",
      chainId: 8453,
      vaultAddress: "0x3333333333333333333333333333333333333333",
      mode: "live",
    });
    // Force period window
    const sub = store.getSubscription(created.subscription.id)!;
    const start = new Date("2026-10-01T00:00:00.000Z");
    const end = new Date("2026-11-01T00:00:00.000Z");
    store.saveSubscription({
      ...sub,
      currentPeriodStart: start,
      currentPeriodEnd: end,
      status: "active",
    });

    const result = changeSubscriptionPlan(store, {
      subscriptionId: sub.id,
      newAmountUsdc: 99,
      newPlanId: "price_growth",
      now: new Date("2026-10-16T00:00:00.000Z"),
    });
    assert.ok(result);
    assert.equal(result!.subscription.amountUsdc, 99);
    assert.equal(result!.subscription.planId, "price_growth");
    assert.ok(result!.invoice);
    assert.equal(result!.invoice!.status, "open");
    assert.ok(result!.invoice!.amountUsdc > 0);
  });

  it("skips invoice on pure downgrade leftover credit", () => {
    const store = createMemoryBillingStore();
    const created = createSubscription(store, {
      merchantId: "m1",
      merchantRef: "ref-2",
      walletAddress: "0x1111111111111111111111111111111111111111",
      payoutAddressEvm: "0x2222222222222222222222222222222222222222",
      amountUsdc: 99,
      interval: "month",
      chainId: 8453,
      vaultAddress: "0x3333333333333333333333333333333333333333",
      mode: "live",
    });
    const sub = store.getSubscription(created.subscription.id)!;
    store.saveSubscription({
      ...sub,
      currentPeriodStart: new Date("2026-10-01T00:00:00.000Z"),
      currentPeriodEnd: new Date("2026-11-01T00:00:00.000Z"),
      status: "active",
    });
    const result = changeSubscriptionPlan(store, {
      subscriptionId: sub.id,
      newAmountUsdc: 20,
      now: new Date("2026-10-16T00:00:00.000Z"),
    });
    assert.ok(result);
    assert.equal(result!.invoice, null);
    assert.ok(result!.proration.leftoverCreditUsdc > 0);
  });
});
