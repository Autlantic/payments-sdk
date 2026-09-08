import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  AutlanticBilling,
  AUTLANTIC_API_VERSION,
  AutlanticBillingError,
  assertBillingWebhook,
  billingModeFromApiKey,
  createConsoleBillingLogger,
  parseBillingWebhookEventDetailed,
  redactSecret,
  sandboxFromApiKeyAndEnv,
  signBillingWebhook,
  verifyBillingWebhook,
  verifyBillingWebhookDetailed,
} from "./index";

describe("AUTLANTIC_API_VERSION", () => {
  it("pins the hosted contract version", () => {
    assert.equal(AUTLANTIC_API_VERSION, "2026-01-01");
  });
});

describe("billingModeFromApiKey / sandboxFromApiKeyAndEnv", () => {
  it("derives mode and sandbox from the API key", () => {
    assert.equal(billingModeFromApiKey("abk_test_x"), "test");
    assert.equal(billingModeFromApiKey("abk_live_x"), "live");
    assert.equal(sandboxFromApiKeyAndEnv("abk_test_x", {}), true);
    assert.equal(sandboxFromApiKeyAndEnv("abk_live_x", {}), false);
    assert.equal(
      sandboxFromApiKeyAndEnv("abk_live_x", { AUTLANTIC_BILLING_ALLOW_LIVE_SANDBOX: "true" }),
      true,
    );
  });
});

describe("AutlanticBilling sandbox", () => {
  it("creates, completes, and charges a subscription", async () => {
    const billing = AutlanticBilling.sandbox({ merchantId: "mer_demo" });

    const created = await billing.createSubscription({
      merchantRef: "order_sdk_1",
      customerWallet: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0",
      payoutAddressEvm: "0x1111111111111111111111111111111111111111",
      amountUsdc: 25,
      interval: "month",
    });

    assert.equal(created.subscription.status, "incomplete");
    assert.ok(created.checkoutUrl?.includes(created.subscription.id));

    const activated = await billing.activateSubscription(created.subscription.id);
    assert.equal(activated.subscription.status, "active");
    assert.equal(activated.charge?.ok, true);
    assert.equal(activated.charge?.invoice.status, "paid");
  });

  it("creates and confirms a one-time payment", async () => {
    const billing = AutlanticBilling.sandbox({ merchantId: "mer_demo" });

    const created = await billing.createPayment({
      merchantRef: "order_pay_1",
      customerWallet: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0",
      payoutAddressEvm: "0x1111111111111111111111111111111111111111",
      amountUsdc: 15,
    });

    assert.equal(created.payment.status, "open");
    assert.ok(created.checkoutUrl?.includes(created.payment.id));

    const confirmed = await billing.confirmPayment(created.payment.id);
    assert.equal(confirmed.payment.status, "paid");
  });

  it("creates a payment link and opens it into a one-time payment", async () => {
    const billing = AutlanticBilling.sandbox({ merchantId: "mer_demo" });

    const created = await billing.createPaymentLink({
      merchantRefPrefix: "qr",
      payoutAddressEvm: "0x1111111111111111111111111111111111111111",
      amountUsdc: 30,
      description: "Table 4",
      maxUses: 2,
    });

    assert.equal(created.paymentLink.status, "active");
    assert.ok(created.url.includes(created.paymentLink.id));

    const opened = await billing.openPaymentLink(created.paymentLink.id, {
      customerWallet: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0",
    });
    assert.equal(opened.payment.amountUsdc, 30);
    assert.equal(opened.payment.merchantRef, "qr_1");
    assert.ok(opened.checkoutUrl?.includes(opened.payment.id));

    const confirmed = await billing.confirmPayment(opened.payment.id);
    assert.equal(confirmed.payment.status, "paid");
  });

  it("signs and verifies webhooks", () => {
    const event = {
      type: "invoice.paid" as const,
      id: "evt_test",
      createdAt: new Date().toISOString(),
      data: {},
    };
    const { body, signature } = signBillingWebhook("secret", event);
    assert.equal(verifyBillingWebhook("secret", body, signature), true);
    assert.equal(verifyBillingWebhook("wrong", body, signature), false);
  });

  it("returns detailed webhook verify/parse failures", () => {
    const event = {
      type: "invoice.paid" as const,
      id: "evt_detail",
      createdAt: new Date().toISOString(),
      data: {},
    };
    const { body, signature } = signBillingWebhook("secret", event);
    assert.deepEqual(verifyBillingWebhookDetailed("secret", body, signature), { ok: true });
    assert.equal(
      verifyBillingWebhookDetailed("secret", body, null).reason,
      "missing_header",
    );
    assert.equal(
      verifyBillingWebhookDetailed("secret", body, "00").reason,
      "length_mismatch",
    );
    assert.equal(
      verifyBillingWebhookDetailed("wrong", body, signature).reason,
      "invalid_signature",
    );
    assert.equal(parseBillingWebhookEventDetailed("{").reason, "invalid_json");
    assert.equal(parseBillingWebhookEventDetailed("{}").reason, "missing_fields");
    assert.equal(parseBillingWebhookEventDetailed(body).ok, true);
    assert.throws(
      () => assertBillingWebhook("secret", body, null),
      (err: unknown) =>
        AutlanticBillingError.is(err) && err.code === "webhook_missing_header",
    );
  });

  it("throws typed AutlanticBillingError in sandbox", async () => {
    const billing = AutlanticBilling.sandbox({ merchantId: "mer_demo" });
    await assert.rejects(
      () =>
        billing.createSubscription({
          merchantRef: "x",
          customerWallet: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0",
          payoutAddressEvm: "0x1111111111111111111111111111111111111111",
        } as never),
      (err: unknown) =>
        AutlanticBillingError.is(err) &&
        err.type === "validation_error" &&
        err.code === "validation_error",
    );
    await assert.rejects(
      () => billing.getPaymentLink("plink_missing"),
      (err: unknown) => AutlanticBillingError.is(err) && err.type === "not_found",
    );
  });

  it("emits redacted debug logs when debug is enabled", async () => {
    const lines: string[] = [];
    const billing = AutlanticBilling.sandbox({
      merchantId: "mer_demo",
      debug: true,
      logger: createConsoleBillingLogger({
        minLevel: "debug",
        writers: {
          debug: (line) => lines.push(line),
          info: (line) => lines.push(line),
          warn: (line) => lines.push(line),
          error: (line) => lines.push(line),
        },
      }),
    });
    await billing.createPayment({
      merchantRef: "log_pay",
      customerWallet: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0",
      payoutAddressEvm: "0x1111111111111111111111111111111111111111",
      amountUsdc: 3,
    });
    assert.ok(lines.some((l) => l.includes("sandbox.createPayment")));
    assert.equal(redactSecret("abk_live_abcdefghijklmnop"), "abk_…mnop");
  });

  it("covers list/get/cancel/refund/void sandbox client surface", async () => {
    const billing = AutlanticBilling.sandbox({ merchantId: "mer_demo" });
    const wallet = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0";
    const payout = "0x1111111111111111111111111111111111111111";

    const created = await billing.createSubscription({
      merchantRef: "order_surface_1",
      customerWallet: wallet,
      payoutAddressEvm: payout,
      amountUsdc: 18,
      interval: "month",
    });
    await billing.activateSubscription(created.subscription.id);

    const listed = await billing.listSubscriptions();
    assert.ok(listed.subscriptions.some((s) => s.id === created.subscription.id));
    assert.equal((await billing.getSubscription(created.subscription.id)).status, "active");

    const invoices = await billing.listInvoices({ subscriptionId: created.subscription.id });
    const paid = invoices.invoices.find((i) => i.status === "paid");
    assert.ok(paid);
    assert.equal((await billing.refundInvoice(paid.id)).invoice.status, "refunded");

    const openSub = await billing.createSubscription({
      merchantRef: "order_surface_void",
      customerWallet: wallet,
      payoutAddressEvm: payout,
      amountUsdc: 11,
      interval: "month",
    });
    const openInv = (await billing.listInvoices({ subscriptionId: openSub.subscription.id }))
      .invoices[0];
    assert.ok(openInv);
    assert.equal((await billing.voidInvoice(openInv.id)).invoice.status, "void");

    const canceled = await billing.cancelSubscription(created.subscription.id, false);
    assert.equal(canceled.subscription.cancelAtPeriodEnd, true);
    const resumed = await billing.resumeSubscription(created.subscription.id);
    assert.equal(resumed.subscription.cancelAtPeriodEnd, false);

    const pay = await billing.createPayment({
      merchantRef: "order_surface_pay",
      customerWallet: wallet,
      payoutAddressEvm: payout,
      amountUsdc: 7,
    });
    assert.equal((await billing.getPayment(pay.payment.id)).id, pay.payment.id);
    assert.ok(Array.isArray(await billing.listPaymentLinks()));
    assert.ok(Array.isArray((await billing.listProducts()).products));
  });
});
