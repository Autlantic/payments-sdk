import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { VAULT_PLACEHOLDER_BASE_SEPOLIA } from "@autlantic/chain-evm";
import {
  createMemoryBillingStore,
  createOrReuseSubscription,
  createSubscription,
  expireIncompleteCheckouts,
  findReusableIncompleteSubscription,
  processDueInvoicesLive,
} from "./index.ts";

const baseInput = {
  merchantId: "mer_1",
  merchantRef: "autlantic:creator:plan:user",
  walletAddress: "0x0000000000000000000000000000000000000001",
  payoutAddressEvm: "0x0000000000000000000000000000000000000002",
  amountUsdc: 29,
  interval: "month" as const,
  chainId: 8453 as const,
  planId: "price_1",
  vaultAddress: VAULT_PLACEHOLDER_BASE_SEPOLIA,
  mode: "live" as const,
  metadata: {
    billingKind: "creator_membership",
    planId: "plan_1",
    priceId: "price_1",
    subscriberUserId: "user_1",
    customerEmail: "member@example.com",
  },
};

describe("createOrReuseSubscription", () => {
  it("reuses incomplete checkout for the same merchantRef", () => {
    const store = createMemoryBillingStore();
    const first = createOrReuseSubscription(store, baseInput);
    assert.equal(first.reused, false);

    const second = createOrReuseSubscription(store, {
      ...baseInput,
      metadata: { ...baseInput.metadata, successUrl: "https://example.com/ok" },
    });
    assert.equal(second.reused, true);
    assert.equal(second.subscription.id, first.subscription.id);
    assert.equal(second.subscription.metadata?.successUrl, "https://example.com/ok");
    assert.equal(
      store.listSubscriptionsByMerchant("mer_1").filter((s) => s.status === "incomplete").length,
      1,
    );
  });

  it("reuses by plan + subscriberUserId when merchantRef differs", () => {
    const store = createMemoryBillingStore();
    const first = createSubscription(store, {
      ...baseInput,
      merchantRef: "random-ref-1",
    });
    const second = createOrReuseSubscription(store, {
      ...baseInput,
      merchantRef: "random-ref-2",
    });
    assert.equal(second.reused, true);
    assert.equal(second.subscription.id, first.subscription.id);
  });

  it("cancels duplicate incompletes when reusing", () => {
    const store = createMemoryBillingStore();
    const a = createSubscription(store, { ...baseInput, merchantRef: "ref-a" });
    const b = createSubscription(store, { ...baseInput, merchantRef: "ref-b" });
    assert.equal(a.subscription.status, "incomplete");
    assert.equal(b.subscription.status, "incomplete");

    const resumed = createOrReuseSubscription(store, baseInput);
    assert.equal(resumed.reused, true);
    const incompletes = store
      .listSubscriptionsByMerchant("mer_1")
      .filter((s) => s.status === "incomplete");
    assert.equal(incompletes.length, 1);
    assert.equal(incompletes[0]?.id, resumed.subscription.id);
  });
});

describe("expireIncompleteCheckouts", () => {
  it("cancels incomplete checkouts older than TTL and voids open invoices", () => {
    const store = createMemoryBillingStore();
    const created = createSubscription(store, baseInput);
    const stale = store.getSubscription(created.subscription.id)!;
    store.saveSubscription({
      ...stale,
      createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
    });

    const result = expireIncompleteCheckouts(store, { ttlMs: 24 * 60 * 60 * 1000 });
    assert.equal(result.canceled, 1);
    assert.equal(result.voidedInvoices, 1);
    assert.equal(store.getSubscription(created.subscription.id)?.status, "canceled");
    assert.equal(store.getInvoice(created.invoice.id)?.status, "void");
  });

  it("leaves fresh incomplete checkouts alone", () => {
    const store = createMemoryBillingStore();
    const created = createSubscription(store, baseInput);
    const result = expireIncompleteCheckouts(store, { ttlMs: 24 * 60 * 60 * 1000 });
    assert.equal(result.canceled, 0);
    assert.equal(store.getSubscription(created.subscription.id)?.status, "incomplete");
    assert.equal(store.getInvoice(created.invoice.id)?.status, "open");
  });
});

describe("processDueInvoicesLive incomplete without on-chain id", () => {
  it("does not emit payment_failed for incomplete checkouts missing vault.subscribe", async () => {
    const store = createMemoryBillingStore();
    createSubscription(store, baseInput);
    const results = await processDueInvoicesLive(
      store,
      new Date(Date.now() + 60_000),
      async () => ({ ok: false, error: "should not be called" }),
      { mode: "live" },
    );
    assert.equal(results.length, 0);
  });
});

describe("findReusableIncompleteSubscription", () => {
  it("returns null when no incomplete match exists", () => {
    const store = createMemoryBillingStore();
    assert.equal(findReusableIncompleteSubscription(store, baseInput), null);
  });
});
