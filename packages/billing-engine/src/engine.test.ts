import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { defaultSandboxChainId } from "@autlantic/chain-evm";
import { VAULT_PLACEHOLDER_BASE_SEPOLIA } from "@autlantic/chain-evm";
import {
  attemptInvoiceCharge,
  cancelSubscription,
  completeMandate,
  createMemoryBillingStore,
  createSubscription,
  findSubscriptionByOnChainId,
  refundInvoice,
  setOnChainSubscriptionId,
  updateSubscriptionCustomerWallet,
} from "./index";

describe("billing-engine", () => {
  it("creates incomplete subscription with open invoice", () => {
    const store = createMemoryBillingStore();
    const result = createSubscription(store, {
      merchantId: "mer_test",
      merchantRef: "order_1",
      walletAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0",
      payoutAddressEvm: "0x1111111111111111111111111111111111111111",
      amountUsdc: 20,
      interval: "month",
      chainId: defaultSandboxChainId(),
      vaultAddress: VAULT_PLACEHOLDER_BASE_SEPOLIA,
    });

    assert.equal(result.subscription.status, "incomplete");
    assert.equal(result.invoice.status, "open");
    assert.equal(result.events.length, 2);
  });

  it("activates subscription after mandate complete and pays invoice", () => {
    const store = createMemoryBillingStore();
    const { subscription, invoice } = createSubscription(store, {
      merchantId: "mer_test",
      merchantRef: "order_2",
      walletAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0",
      payoutAddressEvm: "0x1111111111111111111111111111111111111111",
      amountUsdc: 15,
      interval: "month",
      chainId: defaultSandboxChainId(),
      vaultAddress: VAULT_PLACEHOLDER_BASE_SEPOLIA,
    });

    const periodStart = subscription.currentPeriodStart.getTime();
    const periodEnd = subscription.currentPeriodEnd.getTime();

    const activated = completeMandate(store, subscription.id);
    assert.equal(activated?.subscription.status, "incomplete");

    const paid = attemptInvoiceCharge(store, invoice.id, { sandbox: true });
    assert.equal(paid?.ok, true);
    assert.equal(paid?.subscription.status, "active");
    assert.equal(paid?.invoice.status, "paid");
    assert.ok(paid?.invoice.txHash?.startsWith("0x"));
    assert.equal(paid?.subscription.currentPeriodStart.getTime(), periodStart);
    assert.equal(paid?.subscription.currentPeriodEnd.getTime(), periodEnd);
  });

  it("marks past_due after sandbox failure retries", () => {
    const store = createMemoryBillingStore();
    const { subscription, invoice } = createSubscription(store, {
      merchantId: "mer_test",
      merchantRef: "order_3",
      walletAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0",
      payoutAddressEvm: "0x1111111111111111111111111111111111111111",
      amountUsdc: 10,
      interval: "month",
      chainId: defaultSandboxChainId(),
      vaultAddress: VAULT_PLACEHOLDER_BASE_SEPOLIA,
    });
    completeMandate(store, subscription.id);

    for (let i = 0; i < 4; i++) {
      attemptInvoiceCharge(store, invoice.id, {
        sandbox: true,
        sandboxMode: "insufficient_balance",
      });
    }

    const sub = store.getSubscription(subscription.id);
    assert.equal(sub?.status, "past_due");
  });

  it("updates customer wallet while incomplete", () => {
    const store = createMemoryBillingStore();
    const { subscription } = createSubscription(store, {
      merchantId: "mer_test",
      merchantRef: "order_5",
      walletAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0",
      payoutAddressEvm: "0x1111111111111111111111111111111111111111",
      amountUsdc: 10,
      interval: "month",
      chainId: defaultSandboxChainId(),
      vaultAddress: VAULT_PLACEHOLDER_BASE_SEPOLIA,
    });

    const updated = updateSubscriptionCustomerWallet(
      store,
      subscription.id,
      "0x2222222222222222222222222222222222222222",
    );
    assert.equal(updated?.walletAddress, "0x2222222222222222222222222222222222222222");
    assert.equal(
      store.getMandate(subscription.mandateId!)?.walletAddress,
      "0x2222222222222222222222222222222222222222",
    );
  });

  it("ignores canceled subscriptions when resolving on-chain id owners", () => {
    const store = createMemoryBillingStore();
    const first = createSubscription(store, {
      merchantId: "mer_test",
      merchantRef: "order_onchain_a",
      walletAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0",
      payoutAddressEvm: "0x1111111111111111111111111111111111111111",
      amountUsdc: 10,
      interval: "month",
      chainId: defaultSandboxChainId(),
      vaultAddress: VAULT_PLACEHOLDER_BASE_SEPOLIA,
    });
    setOnChainSubscriptionId(store, first.subscription.id, "42");
    cancelSubscription(store, first.subscription.id, true);

    assert.equal(findSubscriptionByOnChainId(store, "42"), null);

    const second = createSubscription(store, {
      merchantId: "mer_test",
      merchantRef: "order_onchain_b",
      walletAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0",
      payoutAddressEvm: "0x1111111111111111111111111111111111111111",
      amountUsdc: 10,
      interval: "month",
      chainId: defaultSandboxChainId(),
      vaultAddress: VAULT_PLACEHOLDER_BASE_SEPOLIA,
    });
    setOnChainSubscriptionId(store, second.subscription.id, "42");
    assert.equal(findSubscriptionByOnChainId(store, "42")?.id, second.subscription.id);
    assert.equal(
      findSubscriptionByOnChainId(store, "42", second.subscription.id),
      null,
    );
  });

  it("requires tx hash for live charges", () => {
    const store = createMemoryBillingStore();
    const { subscription, invoice } = createSubscription(store, {
      merchantId: "mer_test",
      merchantRef: "order_live",
      walletAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0",
      payoutAddressEvm: "0x1111111111111111111111111111111111111111",
      amountUsdc: 15,
      interval: "month",
      chainId: defaultSandboxChainId(),
      vaultAddress: VAULT_PLACEHOLDER_BASE_SEPOLIA,
    });

    completeMandate(store, subscription.id);

    const failed = attemptInvoiceCharge(store, invoice.id, { sandbox: false });
    assert.equal(failed?.ok, false);
    assert.equal(failed?.invoice.failureCode, "RELAYER_ERROR");

    const paid = attemptInvoiceCharge(store, invoice.id, {
      sandbox: false,
      txHash: "0x40d92ab13df6748f58ca92867c4dfafd0f8884b527da83e1f19c32b5f5af5626",
    });
    assert.equal(paid?.ok, true);
    assert.equal(
      paid?.invoice.txHash,
      "0x40d92ab13df6748f58ca92867c4dfafd0f8884b527da83e1f19c32b5f5af5626",
    );
  });

  it("refunds a paid invoice in sandbox", () => {
    const store = createMemoryBillingStore();
    const { subscription, invoice } = createSubscription(store, {
      merchantId: "mer_test",
      merchantRef: "order_refund",
      walletAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0",
      payoutAddressEvm: "0x1111111111111111111111111111111111111111",
      amountUsdc: 10,
      interval: "month",
      chainId: defaultSandboxChainId(),
      vaultAddress: VAULT_PLACEHOLDER_BASE_SEPOLIA,
    });
    completeMandate(store, subscription.id);
    attemptInvoiceCharge(store, invoice.id, { sandbox: true });

    const refunded = refundInvoice(store, invoice.id, { sandbox: true });
    assert.equal(refunded?.invoice.status, "refunded");
  });

  it("schedules cancel at period end", () => {
    const store = createMemoryBillingStore();
    const { subscription } = createSubscription(store, {
      merchantId: "mer_test",
      merchantRef: "order_4",
      walletAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0",
      payoutAddressEvm: "0x1111111111111111111111111111111111111111",
      amountUsdc: 10,
      interval: "month",
      chainId: defaultSandboxChainId(),
      vaultAddress: VAULT_PLACEHOLDER_BASE_SEPOLIA,
    });

    const canceled = cancelSubscription(store, subscription.id, false);
    assert.equal(canceled?.subscription.cancelAtPeriodEnd, true);
    assert.equal(canceled?.subscription.status, "incomplete");
  });
});
