import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createMemoryBillingStore } from "./memory-store";
import {
  buildOneTimeCheckoutSessionView,
  confirmOneTimePayment,
  createOneTimePayment,
  findOneTimePaymentByTxHash,
} from "./one-time";

describe("one-time payments", () => {
  it("creates open payment and confirms in sandbox", () => {
    const store = createMemoryBillingStore();
    const created = createOneTimePayment(store, {
      merchantId: "mer_test",
      merchantRef: "order_1",
      customerWallet: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0",
      payoutAddressEvm: "0x1111111111111111111111111111111111111111",
      amountUsdc: 25,
      chainId: 84532,
      productName: "Day pass",
    });

    assert.equal(created.payment.status, "open");
    assert.equal(created.events[0]?.type, "payment.created");

    const session = buildOneTimeCheckoutSessionView(store, created.payment.id, {
      sandbox: true,
      merchantDisplayName: "Acme",
    });
    assert.ok(session);
    assert.equal(session?.interval, "once");
    assert.match(session?.transferCalldata ?? "", /^0xa9059cbb/);

    const confirmed = confirmOneTimePayment(store, created.payment.id);
    assert.ok(confirmed);
    assert.equal(confirmed?.payment.status, "paid");
    assert.equal(confirmed?.events[0]?.type, "payment.paid");
    assert.equal(confirmed?.alreadyPaid, false);

    const again = confirmOneTimePayment(store, created.payment.id);
    assert.equal(again?.alreadyPaid, true);
  });

  it("rejects confirming a live txHash already used by another payment", () => {
    const store = createMemoryBillingStore();
    const txHash =
      "0x40d92ab13df6748f58ca92867c4dfafd0f8884b527da83e1f19c32b5f5af5626";
    const first = createOneTimePayment(store, {
      merchantId: "mer_test",
      merchantRef: "order_tx_a",
      customerWallet: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0",
      payoutAddressEvm: "0x1111111111111111111111111111111111111111",
      amountUsdc: 10,
      chainId: 84532,
    });
    const confirmed = confirmOneTimePayment(store, first.payment.id, { txHash });
    assert.ok(confirmed);
    assert.equal(confirmed?.payment.txHash, txHash);
    assert.equal(findOneTimePaymentByTxHash(store, txHash)?.id, first.payment.id);

    const second = createOneTimePayment(store, {
      merchantId: "mer_test",
      merchantRef: "order_tx_b",
      customerWallet: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0",
      payoutAddressEvm: "0x1111111111111111111111111111111111111111",
      amountUsdc: 10,
      chainId: 84532,
    });
    assert.equal(confirmOneTimePayment(store, second.payment.id, { txHash }), null);
    assert.equal(store.getOneTimePayment(second.payment.id)?.status, "open");
  });

  it("exposes coupon discount fields on checkout session", () => {
    const store = createMemoryBillingStore();
    const created = createOneTimePayment(store, {
      merchantId: "mer_test",
      merchantRef: "order_2",
      customerWallet: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0",
      payoutAddressEvm: "0x1111111111111111111111111111111111111111",
      amountUsdc: 80,
      chainId: 84532,
      metadata: {
        listAmountUsdc: "100",
        couponCode: "SAVE20",
        couponLabel: "20% off",
      },
    });

    const session = buildOneTimeCheckoutSessionView(store, created.payment.id, {
      sandbox: true,
    });
    assert.equal(session?.amountUsdc, 80);
    assert.equal(session?.listAmountUsdc, 100);
    assert.equal(session?.couponCode, "SAVE20");
    assert.equal(session?.couponLabel, "20% off");
  });
});
