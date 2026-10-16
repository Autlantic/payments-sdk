import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createHmac } from "node:crypto";
import {
  signBillingWebhookBody,
  verifyBillingWebhookDetailed,
  BILLING_WEBHOOK_TOLERANCE_SEC,
} from "./webhook";

describe("webhook signatures", () => {
  const secret = "whsec_test";
  const body = JSON.stringify({ id: "evt_1", type: "invoice.paid", data: {} });

  it("signs and verifies timestamped headers", () => {
    const now = 1_700_000_000;
    const header = signBillingWebhookBody(secret, body, now);
    const ok = verifyBillingWebhookDetailed(secret, body, header, { nowSec: now });
    assert.equal(ok.ok, true);
    assert.match(header, /^t=\d+,v1=[0-9a-f]+$/);
  });

  it("rejects expired timestamped signatures", () => {
    const now = 1_700_000_000;
    const header = signBillingWebhookBody(secret, body, now - BILLING_WEBHOOK_TOLERANCE_SEC - 1);
    const result = verifyBillingWebhookDetailed(secret, body, header, { nowSec: now });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, "timestamp_expired");
  });

  it("accepts legacy raw hex outside production", () => {
    const prevNode = process.env.NODE_ENV;
    const prevAllow = process.env.AUTLANTIC_BILLING_ALLOW_LEGACY_WEBHOOK_SIG;
    process.env.NODE_ENV = "test";
    delete process.env.AUTLANTIC_BILLING_ALLOW_LEGACY_WEBHOOK_SIG;
    try {
      const legacy = createHmac("sha256", secret).update(body).digest("hex");
      const result = verifyBillingWebhookDetailed(secret, body, legacy);
      assert.equal(result.ok, true);
    } finally {
      process.env.NODE_ENV = prevNode;
      if (prevAllow === undefined) delete process.env.AUTLANTIC_BILLING_ALLOW_LEGACY_WEBHOOK_SIG;
      else process.env.AUTLANTIC_BILLING_ALLOW_LEGACY_WEBHOOK_SIG = prevAllow;
    }
  });

  it("rejects legacy raw hex in production", () => {
    const prevNode = process.env.NODE_ENV;
    const prevAllow = process.env.AUTLANTIC_BILLING_ALLOW_LEGACY_WEBHOOK_SIG;
    process.env.NODE_ENV = "production";
    delete process.env.AUTLANTIC_BILLING_ALLOW_LEGACY_WEBHOOK_SIG;
    try {
      const legacy = createHmac("sha256", secret).update(body).digest("hex");
      const result = verifyBillingWebhookDetailed(secret, body, legacy);
      assert.equal(result.ok, false);
      if (!result.ok) assert.equal(result.reason, "legacy_signature_rejected");
    } finally {
      process.env.NODE_ENV = prevNode;
      if (prevAllow === undefined) delete process.env.AUTLANTIC_BILLING_ALLOW_LEGACY_WEBHOOK_SIG;
      else process.env.AUTLANTIC_BILLING_ALLOW_LEGACY_WEBHOOK_SIG = prevAllow;
    }
  });
});
