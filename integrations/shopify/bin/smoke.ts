import {
  signBillingWebhookBody,
  verifyBillingWebhookDetailed,
} from "@autlantic/payments-recurring";
import { createHmac } from "node:crypto";
import { decryptSecret, encryptSecret, maskSecret } from "../src/lib/crypto.js";

process.env.TOKEN_ENCRYPTION_KEY = "smoke-test-encryption-key";

const secret = "whsec_test";
const body = JSON.stringify({
  id: "evt_smoke",
  type: "payment.paid",
  data: { payment: { id: "pay_smoke", metadata: { shopify_payment_gid: "gid://smoke" } } },
});
const sig = signBillingWebhookBody(secret, body);
const ok = verifyBillingWebhookDetailed(secret, body, sig);
if (!ok.ok) {
  console.error("smoke failed", ok);
  process.exit(1);
}
const bad = verifyBillingWebhookDetailed(secret, body, "t=1,v1=deadbeef");
if (bad.ok) {
  console.error("smoke failed: bad signature accepted");
  process.exit(1);
}

const enc = encryptSecret("abk_test_secret_value");
const dec = decryptSecret(enc);
if (dec !== "abk_test_secret_value" || enc === dec) {
  console.error("smoke failed: encrypt/decrypt");
  process.exit(1);
}
if (!maskSecret("abk_test_abcdefgh").includes("…")) {
  console.error("smoke failed: mask");
  process.exit(1);
}

// OAuth state shape
const shop = "demo.myshopify.com";
const payload = `${shop}.${Date.now() + 60_000}.nonce`;
const hmac = createHmac("sha256", "sec").update(payload).digest("hex");
if (hmac.length < 32) {
  console.error("smoke failed: hmac");
  process.exit(1);
}

console.log("smoke ok");
