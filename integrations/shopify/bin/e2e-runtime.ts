#!/usr/bin/env tsx
/**
 * Shopify owned-code runtime E2E (local Postgres + real Autlantic Test API).
 *
 * Usage:
 *   set -a && source /path/to/billing-e2e.env && set +a
 *   DATABASE_URL=postgresql://localhost/shopify_autlantic_e2e \
 *   pnpm --filter @autlantic/shopify-billing e2e
 *
 * Stubs Shopify Payments Apps GraphQL via AUTLANTIC_SHOPIFY_E2E_STUB=1 (local only).
 * Proves Autlantic HMAC, payment.paid → payment id, refundPayment, payment.refunded,
 * and settings test-connection against hosted Billing.
 */

import { signBillingWebhookBody } from "@autlantic/payments-recurring";
import { spawn, type ChildProcess } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  createCsrfToken,
  createShopSessionCookie,
} from "../src/lib/shopify-security.js";
import {
  ensureSchema,
  getSession,
  putSession,
  saveShopBilling,
  upsertShopInstall,
} from "../src/lib/db.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const shop = "e2e-autlantic.myshopify.com";
const port = Number(process.env.E2E_PORT ?? 3460);
const base = `http://127.0.0.1:${port}`;

function fail(msg: string): never {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
}

function pass(msg: string): void {
  console.log(`PASS: ${msg}`);
}

function requireEnv(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) fail(`Set ${name}`);
  return v;
}

async function waitHealthy(timeoutMs = 20000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${base}/health`);
      if (res.ok) {
        const json = (await res.json()) as { ok?: boolean };
        if (json.ok) return;
      }
    } catch {
      /* retry */
    }
    await sleep(250);
  }
  fail("server did not become healthy");
}

async function main(): Promise<void> {
  const apiKey = requireEnv("AUTLANTIC_BILLING_API_KEY");
  const webhookSecret = requireEnv("AUTLANTIC_BILLING_WEBHOOK_SECRET");
  const apiUrl = process.env.AUTLANTIC_BILLING_API_URL?.trim() || "https://billing.autlantic.com";
  requireEnv("DATABASE_URL");

  process.env.TOKEN_ENCRYPTION_KEY ||= "shopify-e2e-encryption-key";
  process.env.SHOPIFY_API_SECRET ||= "shopify-e2e-api-secret";
  process.env.SHOPIFY_API_KEY ||= "shopify-e2e-api-key";
  process.env.SHOPIFY_APP_URL = base;
  process.env.AUTLANTIC_SHOPIFY_E2E_STUB = "1";
  process.env.PORT = String(port);
  process.env.DATABASE_SSL = "false";

  await ensureSchema();
  await upsertShopInstall({
    shopDomain: shop,
    accessToken: "shpat_e2e_stub_token",
    scopes: "read_orders,write_orders",
  });
  await saveShopBilling({
    shopDomain: shop,
    billingApiKey: apiKey,
    billingWebhookSecret: webhookSecret,
    billingApiUrl: apiUrl,
    payoutAddressEvm: "0x0000000000000000000000000000000000000001",
  });
  pass("seeded shop with Autlantic Test credentials");

  const child: ChildProcess = spawn(
    process.execPath,
    ["--import", "tsx", join(root, "src/index.ts")],
    {
      cwd: root,
      env: { ...process.env },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let childLog = "";
  child.stdout?.on("data", (buf) => {
    childLog += String(buf);
  });
  child.stderr?.on("data", (buf) => {
    childLog += String(buf);
  });

  const shutdown = async () => {
    if (!child.killed) {
      child.kill("SIGTERM");
      await sleep(300);
      if (!child.killed) child.kill("SIGKILL");
    }
  };
  process.on("exit", () => {
    if (!child.killed) child.kill("SIGKILL");
  });

  try {
    await waitHealthy();
    pass(`server healthy on ${base}`);

    const cookie = `autlantic_shop_session=${createShopSessionCookie(shop)}`;
    const csrf = createCsrfToken(shop);

    // Test connection (real Billing listProducts)
    const testBody = new URLSearchParams({ shop, csrf });
    const testRes = await fetch(`${base}/app/test-connection`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: cookie,
      },
      body: testBody,
      redirect: "manual",
    });
    const loc = testRes.headers.get("location") ?? "";
    if (testRes.status !== 302 || !loc.includes("tested=1")) {
      fail(`test-connection expected 302 tested=1 got ${testRes.status} ${loc}`);
    }
    pass("test-connection listProducts OK");

    const gid = "gid://shopify/PaymentSession/e2e-runtime-1";
    await putSession({
      shopifyGid: gid,
      shopDomain: shop,
      amount: "1",
      currency: "USD",
      gid,
      paymentLinkId: "plink_e2e_placeholder",
      status: "pending",
      createdAt: Date.now(),
    });

    // Create real sandbox payment so refundPayment can succeed
    const payCreate = await fetch(`${apiUrl.replace(/\/$/, "")}/v1/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-autlantic-api-key": apiKey,
        "Autlantic-Version": "2026-01-01",
        "Idempotency-Key": `shopify-e2e-${Date.now()}`,
      },
      body: JSON.stringify({
        merchantRef: `shop_e2e_${Date.now()}`,
        customerWallet: "0x0000000000000000000000000000000000000001",
        amountUsdc: 1,
        successUrl: "https://example.com/ok",
        cancelUrl: "https://example.com/cancel",
        metadata: {
          shopify_payment_gid: gid,
          shopify_shop: shop,
          m2_e2e: "shopify",
        },
      }),
    });
    const payJson = (await payCreate.json()) as {
      payment?: { id?: string };
      error?: string;
    };
    const paymentId = String(payJson.payment?.id ?? "");
    if (!payCreate.ok || !paymentId) {
      fail(`createPayment failed: ${payCreate.status} ${JSON.stringify(payJson)}`);
    }

    const statusRes = await fetch(
      `${apiUrl.replace(/\/$/, "")}/checkout/pay/${encodeURIComponent(paymentId)}/status`,
    );
    const statusJson = (await statusRes.json()) as { actionToken?: string };
    const actionToken = String(statusJson.actionToken ?? "");
    if (!actionToken) fail("checkout status missing actionToken");
    const confirmRes = await fetch(
      `${apiUrl.replace(/\/$/, "")}/checkout/pay/${encodeURIComponent(paymentId)}/confirm`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionToken }),
      },
    );
    const confirmJson = (await confirmRes.json()) as {
      paid?: boolean;
      payment?: { status?: string };
    };
    if (
      !confirmRes.ok ||
      (confirmJson.payment?.status !== "paid" && confirmJson.paid !== true)
    ) {
      fail(`sandbox confirm failed: ${confirmRes.status} ${JSON.stringify(confirmJson)}`);
    }
    pass(`sandbox payment paid ${paymentId}`);

    const rawEvent = JSON.stringify({
      id: `evt_shopify_e2e_${Date.now()}`,
      type: "payment.paid",
      data: {
        payment: {
          id: paymentId,
          status: "paid",
          amountUsdc: 1,
          metadata: {
            shopify_payment_gid: gid,
            shopify_shop: shop,
          },
        },
      },
    });

    const badWh = await fetch(`${base}/webhooks/autlantic/${encodeURIComponent(shop)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Autlantic-Signature": "t=1,v1=deadbeef",
      },
      body: rawEvent,
    });
    if (badWh.status !== 401) {
      fail(`bad Autlantic HMAC expected 401 got ${badWh.status}`);
    }
    pass("Autlantic webhook bad HMAC => 401");

    const goodSig = signBillingWebhookBody(webhookSecret, rawEvent);
    const goodWh = await fetch(`${base}/webhooks/autlantic/${encodeURIComponent(shop)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Autlantic-Signature": goodSig,
      },
      body: rawEvent,
    });
    const goodBody = await goodWh.text();
    if (!goodWh.ok) {
      fail(`good payment.paid expected 2xx got ${goodWh.status} ${goodBody}`);
    }
    pass(`Autlantic webhook payment.paid => ${goodWh.status}`);

    const sessionAfterPaid = await getSession(gid);
    if (!sessionAfterPaid || sessionAfterPaid.status !== "resolved") {
      fail(`session status expected resolved got ${sessionAfterPaid?.status}`);
    }
    if (sessionAfterPaid.paymentId !== paymentId) {
      fail(`session paymentId expected ${paymentId} got ${sessionAfterPaid.paymentId}`);
    }
    pass("session resolved with Autlantic payment id");

    const refundGid = "gid://shopify/RefundSession/e2e-runtime-1";
    const refundRes = await fetch(`${base}/refund`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Shopify-Shop-Domain": shop,
      },
      body: JSON.stringify({
        id: refundGid,
        payment_id: gid,
        amount: { value: "1", currency: "USD" },
      }),
    });
    const refundBody = await refundRes.text();
    if (!refundRes.ok) {
      fail(`refund expected 2xx got ${refundRes.status} ${refundBody}`);
    }
    pass("refundPayment + refundSessionResolve OK");

    const remotePay = await fetch(
      `${apiUrl.replace(/\/$/, "")}/v1/payments/${encodeURIComponent(paymentId)}`,
      {
        headers: {
          "x-autlantic-api-key": apiKey,
          "Autlantic-Version": "2026-01-01",
        },
      },
    );
    const remoteJson = (await remotePay.json()) as { payment?: { status?: string } };
    if (remoteJson.payment?.status !== "refunded") {
      fail(`Billing payment status expected refunded got ${remoteJson.payment?.status}`);
    }
    pass("Billing API payment status=refunded");

    const refundEvent = JSON.stringify({
      id: `evt_shopify_e2e_ref_${Date.now()}`,
      type: "payment.refunded",
      data: {
        payment: {
          id: paymentId,
          status: "refunded",
          amountUsdc: 1,
          refundAmountUsdc: 1,
          metadata: {
            shopify_payment_gid: gid,
            shopify_shop: shop,
          },
        },
      },
    });
    const refundSig = signBillingWebhookBody(webhookSecret, refundEvent);
    const refundWh = await fetch(`${base}/webhooks/autlantic/${encodeURIComponent(shop)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Autlantic-Signature": refundSig,
      },
      body: refundEvent,
    });
    if (!refundWh.ok) {
      fail(`payment.refunded expected 2xx got ${refundWh.status}`);
    }
    const sessionAfterRefund = await getSession(gid);
    if (sessionAfterRefund?.status !== "refunded") {
      fail(`session status expected refunded got ${sessionAfterRefund?.status}`);
    }
    pass("payment.refunded updated session");

    // Shopify webhook bad HMAC (against local secret)
    const shopifyBad = await fetch(`${base}/webhooks/shopify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Hmac-Sha256": "deadbeef",
        "X-Shopify-Topic": "app/uninstalled",
        "X-Shopify-Shop-Domain": shop,
      },
      body: "{}",
    });
    if (shopifyBad.status !== 401) {
      fail(`Shopify bad HMAC expected 401 got ${shopifyBad.status}`);
    }
    pass("Shopify webhook bad HMAC => 401");

    console.log("\nENTERPRISE_PROVEN_SHOPIFY_OWNED_E2E_OK");
    console.log(`shop=${shop} payment=${paymentId} gid=${gid}`);
  } catch (err) {
    console.error(childLog.slice(-2000));
    throw err;
  } finally {
    await shutdown();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
