import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { matchVaultSubscriptionViewToCheckout } from "./preflight";
import type { VaultSubscriptionView } from "./vault";
import { usdcToMicro } from "./constants";

const CUSTOMER = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0";
const MERCHANT = "0x1111111111111111111111111111111111111111";

function view(overrides: Partial<VaultSubscriptionView> = {}): VaultSubscriptionView {
  return {
    customer: CUSTOMER,
    merchant: MERCHANT,
    amountPerPeriodMicro: usdcToMicro(10),
    maxChargeAmountMicro: usdcToMicro(10),
    periodStart: 1_700_000_000,
    periodEnd: 1_702_592_000,
    periodDurationSeconds: 2_592_000,
    active: true,
    cancelAtPeriodEnd: false,
    ...overrides,
  };
}

describe("matchVaultSubscriptionViewToCheckout", () => {
  it("accepts an active matching vault row", () => {
    const result = matchVaultSubscriptionViewToCheckout(view(), {
      customerWallet: CUSTOMER.toUpperCase(),
      merchantWallet: MERCHANT,
      amountUsdc: 10,
    });
    assert.equal(result.ok, true);
  });

  it("rejects missing view", () => {
    const result = matchVaultSubscriptionViewToCheckout(null, {
      customerWallet: CUSTOMER,
      merchantWallet: MERCHANT,
      amountUsdc: 10,
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.code, "NOT_FOUND");
  });

  it("rejects inactive view", () => {
    const result = matchVaultSubscriptionViewToCheckout(view({ active: false }), {
      customerWallet: CUSTOMER,
      merchantWallet: MERCHANT,
      amountUsdc: 10,
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.code, "INACTIVE");
  });

  it("rejects customer mismatch", () => {
    const result = matchVaultSubscriptionViewToCheckout(view(), {
      customerWallet: "0x2222222222222222222222222222222222222222",
      merchantWallet: MERCHANT,
      amountUsdc: 10,
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.code, "CUSTOMER_MISMATCH");
  });

  it("rejects merchant mismatch", () => {
    const result = matchVaultSubscriptionViewToCheckout(view(), {
      customerWallet: CUSTOMER,
      merchantWallet: "0x2222222222222222222222222222222222222222",
      amountUsdc: 10,
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.code, "MERCHANT_MISMATCH");
  });

  it("rejects amount mismatch", () => {
    const result = matchVaultSubscriptionViewToCheckout(view(), {
      customerWallet: CUSTOMER,
      merchantWallet: MERCHANT,
      amountUsdc: 9.99,
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.code, "AMOUNT_MISMATCH");
  });
});
