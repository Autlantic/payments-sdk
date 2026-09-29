import {
  signBillingWebhookBody,
  verifyBillingWebhookDetailed,
} from "@autlantic/payments-recurring";
import { createHmac } from "node:crypto";
import { decryptSecret, encryptSecret, maskSecret } from "../src/lib/crypto.js";
import {
  createCsrfToken,
  createShopSessionCookie,
  verifyCsrfToken,
  verifyShopSessionCookie,
  verifyShopifyQueryHmac,
  verifyShopifyWebhookHmac,
} from "../src/lib/shopify-security.js";

process.env.TOKEN_ENCRYPTION_KEY = "smoke-test-encryption-key";
process.env.SHOPIFY_API_SECRET = "shopify-smoke-secret";

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

const shop = "demo.myshopify.com";
const cookie = createShopSessionCookie(shop);
if (!verifyShopSessionCookie(cookie, shop) || verifyShopSessionCookie(cookie, "other.myshopify.com")) {
  console.error("smoke failed: shop session cookie");
  process.exit(1);
}
const csrf = createCsrfToken(shop);
if (!verifyCsrfToken(csrf, shop) || verifyCsrfToken(csrf, "other.myshopify.com")) {
  console.error("smoke failed: csrf");
  process.exit(1);
}

const webhookBody = '{"ok":true}';
const webhookHmac = createHmac("sha256", process.env.SHOPIFY_API_SECRET)
  .update(webhookBody, "utf8")
  .digest("base64");
if (!verifyShopifyWebhookHmac(webhookBody, webhookHmac)) {
  console.error("smoke failed: shopify webhook hmac");
  process.exit(1);
}
if (verifyShopifyWebhookHmac(webhookBody, "bad")) {
  console.error("smoke failed: bad shopify webhook hmac accepted");
  process.exit(1);
}

const params: Record<string, string> = {
  code: "x",
  shop,
  state: "y",
  timestamp: "1",
};
const msg = Object.keys(params)
  .sort()
  .map((k) => `${k}=${params[k]}`)
  .join("&");
params.hmac = createHmac("sha256", process.env.SHOPIFY_API_SECRET).update(msg).digest("hex");
if (!verifyShopifyQueryHmac(params)) {
  console.error("smoke failed: oauth query hmac");
  process.exit(1);
}
params.hmac = "deadbeef";
if (verifyShopifyQueryHmac(params)) {
  console.error("smoke failed: bad oauth hmac accepted");
  process.exit(1);
}

console.log("smoke ok");
