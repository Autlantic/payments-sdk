import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { defaultSandboxChainId, VAULT_PLACEHOLDER_BASE_SEPOLIA } from "@autlantic/chain-evm";
import {
  activateSubscriptionCheckout,
  attemptInvoiceCharge,
  cancelSubscriptionsMatching,
  createMemoryBillingStore,
  createSubscription,
} from "./index";

function makeSub(
  store: ReturnType<typeof createMemoryBillingStore>,
  input: { merchantRef: string; creatorId: string; billingKind: string },
) {
  const created = createSubscription(store, {
    merchantId: "mer_autlantic",
    merchantRef: input.merchantRef,
    walletAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0",
    payoutAddressEvm: "0x1111111111111111111111111111111111111111",
    amountUsdc: 20,
    interval: "month",
    chainId: defaultSandboxChainId(),
    vaultAddress: VAULT_PLACEHOLDER_BASE_SEPOLIA,
    metadata: {
      creatorId: input.creatorId,
      billingKind: input.billingKind,
    },
  });
  activateSubscriptionCheckout(store, created.subscription.id, { sandbox: true });
  return created.subscription.id;
}

describe("cancelSubscriptionsMatching", () => {
  it("cancels matching creator subs immediately and voids open invoices", () => {
    const store = createMemoryBillingStore();
    const platformId = makeSub(store, {
      merchantRef: "platform_1",
      creatorId: "creator_a",
      billingKind: "platform",
    });
    const memberId = makeSub(store, {
      merchantRef: "member_1",
      creatorId: "creator_a",
      billingKind: "creator_membership",
    });
    makeSub(store, {
      merchantRef: "other_1",
      creatorId: "creator_b",
      billingKind: "platform",
    });

    // Leave an open renewal-style invoice on the platform sub.
    const platform = store.getSubscription(platformId)!;
    store.saveInvoice({
      id: "inv_open_renewal",
      subscriptionId: platformId,
      merchantId: platform.merchantId,
      amountUsdc: 20,
      status: "open",
      dueAt: new Date(),
      attemptCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      mode: "test",
    });

    const report = cancelSubscriptionsMatching(store, {
      merchantId: "mer_autlantic",
      creatorId: "creator_a",
      immediate: true,
      reason: "admin_close_store",
    });

    assert.equal(report.canceled.length, 2);
    assert.equal(report.failed.length, 0);
    assert.equal(store.getSubscription(platformId)?.status, "canceled");
    assert.equal(store.getSubscription(memberId)?.status, "canceled");
    assert.equal(store.getSubscription(platformId)?.metadata?.cancelReason, "admin_close_store");
    assert.equal(store.getInvoice("inv_open_renewal")?.status, "void");
    assert.equal(attemptInvoiceCharge(store, "inv_open_renewal", { sandbox: true }), null);
  });

  it("is idempotent on a second call", () => {
    const store = createMemoryBillingStore();
    makeSub(store, {
      merchantRef: "platform_2",
      creatorId: "creator_a",
      billingKind: "platform",
    });

    const first = cancelSubscriptionsMatching(store, {
      merchantId: "mer_autlantic",
      creatorId: "creator_a",
      immediate: true,
    });
    assert.equal(first.canceled.length, 1);

    const second = cancelSubscriptionsMatching(store, {
      merchantId: "mer_autlantic",
      creatorId: "creator_a",
      immediate: true,
    });
    assert.equal(second.canceled.length, 0);
    assert.equal(second.alreadyTerminal.length, 1);
    assert.equal(second.failed.length, 0);
  });

  it("filters by billingKind allowlist", () => {
    const store = createMemoryBillingStore();
    const platformId = makeSub(store, {
      merchantRef: "platform_3",
      creatorId: "creator_a",
      billingKind: "platform",
    });
    const memberId = makeSub(store, {
      merchantRef: "member_3",
      creatorId: "creator_a",
      billingKind: "creator_membership",
    });

    const report = cancelSubscriptionsMatching(store, {
      merchantId: "mer_autlantic",
      creatorId: "creator_a",
      billingKinds: ["platform", "platform_lifetime"],
      immediate: true,
    });

    assert.equal(report.canceled.length, 1);
    assert.equal(report.canceled[0]?.id, platformId);
    assert.equal(store.getSubscription(platformId)?.status, "canceled");
    assert.equal(store.getSubscription(memberId)?.status, "active");
  });
});
