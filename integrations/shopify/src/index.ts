import { serve } from "@hono/node-server";
import {
  parseBillingWebhookEvent,
  verifyBillingWebhookDetailed,
} from "@autlantic/payments-recurring";
import { Hono } from "hono";
import { appBaseUrl, createBillingForShop } from "./lib/billing.js";
import { maskSecret } from "./lib/crypto.js";
import {
  addActivity,
  alreadyProcessed,
  deleteShop,
  ensureSchema,
  findSessionByPaymentLink,
  getSession,
  getShop,
  listActivity,
  markProcessed,
  markSession,
  putSession,
  saveShopBilling,
  shopBillingConfigured,
  webhookPathForShop,
} from "./lib/db.js";
import { beginAuthUrl, completeAuth, normalizeShopDomain } from "./lib/shopify-auth.js";
import {
  createCsrfToken,
  createShopSessionCookie,
  parseCookieHeader,
  verifyCsrfToken,
  verifyShopSessionCookie,
  verifyShopifyWebhookHmac,
} from "./lib/shopify-security.js";
import {
  paymentSessionReject,
  paymentSessionResolve,
  refundSessionReject,
} from "./lib/shopify-payments.js";
import { registerAppWebhooks } from "./lib/shopify-webhooks.js";

const app = new Hono();

app.get("/", (c) => {
  const base = appBaseUrl() || "https://shopify.autlantic.com";
  return c.html(`<!doctype html>
<html><head><meta charset="utf-8"><title>Autlantic Billing for Shopify</title>
<style>
body{font-family:ui-sans-serif,system-ui,sans-serif;margin:0;background:#0b1220;color:#e8eefc}
main{max-width:640px;margin:48px auto;padding:0 20px}
code{background:#1a2438;padding:2px 6px;border-radius:6px}
.card{background:#121a2b;border:1px solid #243049;border-radius:14px;padding:20px;margin-top:20px}
a{color:#8eb6ff}
input,button{font:inherit;padding:10px 12px;border-radius:8px;border:1px solid #243049;background:#0b1220;color:#e8eefc;width:100%;box-sizing:border-box}
button{background:#5672cd;border:0;cursor:pointer;margin-top:10px}
label{display:block;margin:12px 0 6px;font-size:13px;color:#9db0d0}
</style></head>
<body><main>
<h1>Autlantic Billing for Shopify</h1>
<p>Each Shopify store connects <strong>its own</strong> Autlantic merchant (portal API key, webhook, payout). Same model as WooCommerce.</p>
<div class="card">
<form method="get" action="/auth">
<label>Shop domain</label>
<input name="shop" placeholder="your-store.myshopify.com" required />
<button type="submit">Install / open settings</button>
</form>
<p style="margin-top:16px;font-size:13px;color:#9db0d0">After install, paste Autlantic credentials from <a href="https://portal.autlantic.com">portal.autlantic.com</a>.</p>
<p style="font-size:13px;color:#9db0d0">Health: <code>${base}/health</code></p>
</div>
</main></body></html>`);
});

app.get("/health", async (c) => {
  try {
    await ensureSchema();
    return c.json({ ok: true, service: "autlantic-shopify", db: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "db error";
    return c.json({ ok: false, service: "autlantic-shopify", error: message }, 503);
  }
});

app.get("/auth", (c) => {
  const shop = c.req.query("shop") ?? "";
  if (!shop.trim()) return c.text("Missing shop", 400);
  return c.redirect(beginAuthUrl(shop), 302);
});

app.get("/auth/callback", async (c) => {
  try {
    const query: Record<string, string> = {};
    const url = new URL(c.req.url);
    url.searchParams.forEach((value, key) => {
      query[key] = value;
    });
    const { shop } = await completeAuth(query);
    const installed = await getShop(shop);
    if (installed?.accessToken) {
      try {
        await registerAppWebhooks({ shopDomain: shop, accessToken: installed.accessToken });
      } catch (err) {
        await addActivity({
          ok: false,
          type: "webhook_register",
          message: err instanceof Error ? err.message : "register failed",
          shopDomain: shop,
        });
      }
    }
    const cookie = createShopSessionCookie(shop);
    c.header(
      "Set-Cookie",
      `autlantic_shop_session=${cookie}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=43200`,
    );
    return c.redirect(`/app/settings?shop=${encodeURIComponent(shop)}`, 302);
  } catch (err) {
    const message = err instanceof Error ? err.message : "OAuth failed";
    return c.text(message, 400);
  }
});

function requireShopSession(c: { req: { header: (n: string) => string | undefined } }, shopDomain: string): boolean {
  const cookies = parseCookieHeader(c.req.header("cookie"));
  return verifyShopSessionCookie(cookies.autlantic_shop_session, shopDomain);
}

app.get("/app/settings", async (c) => {
  const shopDomain = normalizeShopDomain(c.req.query("shop") ?? "");
  if (!shopDomain) return c.text("Missing shop", 400);
  if (!requireShopSession(c, shopDomain)) {
    return c.redirect(`/auth?shop=${encodeURIComponent(shopDomain)}`, 302);
  }
  const shop = await getShop(shopDomain);
  if (!shop) {
    return c.redirect(`/auth?shop=${encodeURIComponent(shopDomain)}`, 302);
  }
  const base = appBaseUrl();
  const webhookUrl = webhookPathForShop(shopDomain, base);
  const configured = shopBillingConfigured(shop);
  const saved = c.req.query("saved") === "1";
  const csrf = createCsrfToken(shopDomain);
  return c.html(`<!doctype html>
<html><head><meta charset="utf-8"><title>Autlantic settings · ${shopDomain}</title>
<style>
body{font-family:ui-sans-serif,system-ui,sans-serif;margin:0;background:#0b1220;color:#e8eefc}
main{max-width:640px;margin:40px auto;padding:0 20px}
code{background:#1a2438;padding:2px 6px;border-radius:6px;word-break:break-all}
.card{background:#121a2b;border:1px solid #243049;border-radius:14px;padding:20px;margin-top:16px}
label{display:block;margin:14px 0 6px;font-size:13px;color:#9db0d0}
input{width:100%;box-sizing:border-box;padding:10px 12px;border-radius:8px;border:1px solid #243049;background:#0b1220;color:#e8eefc;font:inherit}
button{margin-top:16px;background:#5672cd;color:#fff;border:0;border-radius:8px;padding:12px 16px;font:inherit;cursor:pointer}
.ok{color:#6ddea8}.warn{color:#f0c674}.muted{color:#9db0d0;font-size:13px;line-height:1.5}
</style></head>
<body><main>
<h1>Autlantic Billing</h1>
<p class="muted">${shopDomain}</p>
${saved ? '<p class="ok">Saved.</p>' : ""}
<p class="${configured ? "ok" : "warn"}">${
    configured
      ? "Autlantic merchant connected. Ready for payment sessions."
      : "Connect this store’s Autlantic merchant below (from portal.autlantic.com)."
  }</p>
<div class="card">
<form method="post" action="/app/settings">
<input type="hidden" name="shop" value="${shopDomain}" />
<input type="hidden" name="csrf" value="${csrf}" />
<label>Autlantic API key (abk_test_… or abk_live_…)</label>
<input name="billingApiKey" placeholder="${
    shop.billingApiKey ? maskSecret(shop.billingApiKey) : "abk_test_…"
  }" autocomplete="off" />
<label>Webhook signing secret</label>
<input name="billingWebhookSecret" placeholder="${
    shop.billingWebhookSecret ? maskSecret(shop.billingWebhookSecret) : "whsec_…"
  }" autocomplete="off" />
<label>Payout wallet (EVM)</label>
<input name="payoutAddressEvm" value="${shop.payoutAddressEvm}" placeholder="0x…" required />
<label>Billing API URL</label>
<input name="billingApiUrl" value="${shop.billingApiUrl || "https://billing.autlantic.com"}" />
<button type="submit">Save Autlantic merchant</button>
</form>
</div>
<div class="card">
<p><strong>Webhook URL for this store</strong></p>
<p class="muted">In the Autlantic portal, register a webhook endpoint (Test and/or Live) pointing here. Use this store’s signing secret.</p>
<p><code>${webhookUrl}</code></p>
</div>
</main></body></html>`);
});

app.post("/app/settings", async (c) => {
  const body = await c.req.parseBody();
  const shopDomain = normalizeShopDomain(String(body.shop ?? ""));
  if (!shopDomain) return c.text("Missing shop", 400);
  if (!requireShopSession(c, shopDomain)) {
    return c.redirect(`/auth?shop=${encodeURIComponent(shopDomain)}`, 302);
  }
  if (!verifyCsrfToken(String(body.csrf ?? ""), shopDomain)) {
    return c.text("Invalid CSRF token", 403);
  }
  try {
    await saveShopBilling({
      shopDomain,
      billingApiKey: String(body.billingApiKey ?? ""),
      billingWebhookSecret: String(body.billingWebhookSecret ?? ""),
      billingApiUrl: String(body.billingApiUrl ?? ""),
      payoutAddressEvm: String(body.payoutAddressEvm ?? ""),
    });
    return c.redirect(`/app/settings?shop=${encodeURIComponent(shopDomain)}&saved=1`, 302);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Save failed";
    return c.text(message, 400);
  }
});

app.get("/admin/activity", async (c) => {
  const token = process.env.ADMIN_TOKEN?.trim();
  const provided = c.req.header("x-admin-token") ?? c.req.query("token") ?? "";
  if (!token || provided !== token) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  return c.json({ activity: await listActivity() });
});

/** Shopify app / compliance webhooks (HMAC required). */
app.post("/webhooks/shopify", async (c) => {
  const raw = await c.req.text();
  const hmac = c.req.header("x-shopify-hmac-sha256");
  if (!verifyShopifyWebhookHmac(raw, hmac ?? null)) {
    return c.json({ error: "Invalid HMAC" }, 401);
  }
  const topic = (c.req.header("x-shopify-topic") ?? "").toLowerCase();
  const shopDomain = normalizeShopDomain(c.req.header("x-shopify-shop-domain") ?? "");
  if (topic === "app/uninstalled" && shopDomain) {
    await deleteShop(shopDomain);
    await addActivity({ ok: true, type: "app_uninstalled", message: "shop deleted", shopDomain });
  }
  // GDPR topics: acknowledge. Payment data is not customer PII store beyond Shopify order flow.
  return c.json({ ok: true });
});

app.post("/payment", async (c) => {
  const shopDomain = normalizeShopDomain(c.req.header("Shopify-Shop-Domain") ?? "");
  const body = await c.req.json<Record<string, unknown>>();
  const gid = String(body.id ?? body.gid ?? "");
  const amount = String(
    (body.amount as { value?: string } | undefined)?.value ??
      (body.amount as string | undefined) ??
      "",
  );
  const currency = String(
    (body.amount as { currency?: string } | undefined)?.currency ?? body.currency ?? "",
  ).toUpperCase();
  const cancelUrl = String(
    (body.payment_method as { data?: { cancel_url?: string } } | undefined)?.data?.cancel_url ??
      body.cancel_url ??
      "",
  );

  if (!gid || !shopDomain) {
    return c.json({ error: "missing payment session id or shop" }, 400);
  }
  if (!["USD", "USDC"].includes(currency)) {
    return c.json({ error: "Autlantic only supports USD or USDC" }, 422);
  }
  const amountUsdc = Number(amount);
  if (!Number.isFinite(amountUsdc) || amountUsdc <= 0) {
    return c.json({ error: "invalid amount" }, 422);
  }

  const shop = await getShop(shopDomain);
  if (!shop?.accessToken) {
    return c.json({ error: "Shop is not installed on Autlantic Billing" }, 401);
  }
  if (!shopBillingConfigured(shop)) {
    return c.json(
      {
        error:
          "Store has not connected Autlantic yet. Open the Autlantic Billing app and paste portal API key, webhook secret, and payout address.",
      },
      422,
    );
  }

  try {
    const billing = createBillingForShop(shop);
    const successUrl = `${appBaseUrl()}/payment/return?gid=${encodeURIComponent(gid)}`;
    const created = await billing.createPaymentLink({
      amountUsdc,
      merchantRefPrefix: `shop_${gid.replace(/[^a-zA-Z0-9]/g, "").slice(-24)}`,
      description: `Shopify payment ${gid}`,
      maxUses: 1,
      successUrl,
      cancelUrl: cancelUrl || `${appBaseUrl()}/payment/cancel?gid=${encodeURIComponent(gid)}`,
      collectEmail: true,
      payoutAddressEvm: shop.payoutAddressEvm,
      metadata: {
        shopify_payment_gid: gid,
        shopify_shop: shopDomain,
      },
    });

    const link = (created.paymentLink ?? {}) as { id?: string };
    const url = String(created.url ?? "");
    const linkId = String(link.id ?? "");
    if (!url || !linkId) {
      throw new Error("Payment link response missing url or id");
    }

    await putSession({
      shopifyGid: gid,
      shopDomain,
      amount: String(amountUsdc),
      currency,
      gid,
      paymentLinkId: linkId,
      checkoutUrl: url,
      status: "pending",
      createdAt: Date.now(),
    });

    return c.json({ redirect_url: url }, 200);
  } catch (err) {
    const message = err instanceof Error ? err.message : "payment session failed";
    await addActivity({ ok: false, type: "payment_session", message, shopDomain });
    return c.json({ error: message }, 500);
  }
});

app.get("/payment/return", async (c) => {
  const gid = c.req.query("gid") ?? "";
  return c.html(`<!doctype html><html><body style="font-family:system-ui;padding:40px">
<h1>Payment submitted</h1>
<p>Waiting for Autlantic to confirm on-chain. This window can close; Shopify updates when the webhook arrives.</p>
<p><code>${gid}</code></p>
</body></html>`);
});

app.get("/payment/cancel", async (c) => {
  const gid = c.req.query("gid") ?? "";
  const session = gid ? await getSession(gid) : null;
  if (session) {
    const shop = await getShop(session.shopDomain);
    if (shop?.accessToken) {
      try {
        await paymentSessionReject({
          shopDomain: session.shopDomain,
          accessToken: shop.accessToken,
          gid: session.gid,
          reasonMessage: "Customer canceled Autlantic checkout",
        });
        await markSession(session.gid, "rejected");
      } catch {
        /* best effort */
      }
    }
  }
  return c.html(`<!doctype html><html><body style="font-family:system-ui;padding:40px">
<h1>Payment canceled</h1>
<p>Return to Shopify checkout to try another method.</p>
</body></html>`);
});

app.post("/refund", async (c) => {
  const shopDomain = normalizeShopDomain(c.req.header("Shopify-Shop-Domain") ?? "");
  const body = await c.req.json<Record<string, unknown>>();
  const gid = String(body.id ?? body.gid ?? "");
  const shop = shopDomain ? await getShop(shopDomain) : null;
  if (!gid || !shopDomain || !shop?.accessToken) {
    return c.json({ error: "missing refund session context" }, 400);
  }
  try {
    await refundSessionReject({
      shopDomain,
      accessToken: shop.accessToken,
      gid,
      reasonMessage:
        "Autlantic one-time payment-link refunds are manual. Send USDC back from the merchant payout wallet.",
    });
    await addActivity({ ok: true, type: "refund_session", message: `rejected ${gid}`, shopDomain });
    return c.json({ ok: true }, 200);
  } catch (err) {
    const message = err instanceof Error ? err.message : "refund session failed";
    await addActivity({ ok: false, type: "refund_session", message, shopDomain });
    return c.json({ error: message }, 500);
  }
});

/** Per-store webhook: each merchant registers this URL with their portal signing secret. */
app.post("/webhooks/autlantic/:shop", async (c) => {
  const shopDomain = normalizeShopDomain(decodeURIComponent(c.req.param("shop")));
  const shop = await getShop(shopDomain);
  if (!shop?.billingWebhookSecret) {
    return c.json({ error: "Unknown shop or webhook secret not configured" }, 404);
  }

  const raw = await c.req.text();
  const signature =
    c.req.header("x-autlantic-signature") ?? c.req.header("X-Autlantic-Signature") ?? null;
  const verified = verifyBillingWebhookDetailed(shop.billingWebhookSecret, raw, signature);
  if (!verified.ok) {
    await addActivity({
      ok: false,
      type: "",
      message: `signature ${verified.reason ?? "unknown"}`,
      shopDomain,
    });
    return c.json({ error: "Invalid webhook signature" }, 401);
  }

  const event = parseBillingWebhookEvent(raw);
  if (!event) {
    return c.json({ error: "Invalid webhook body" }, 400);
  }

  const eventId = String(event.id ?? "");
  const type = String(event.type ?? "");
  if (eventId && (await alreadyProcessed(eventId))) {
    await addActivity({ ok: true, type, message: `duplicate ${eventId}`, shopDomain });
    return c.json({ received: true, duplicate: true });
  }

  try {
    if (type === "payment.paid") {
      await handlePaymentPaid(event.data as Record<string, unknown>, shopDomain);
    }
    if (eventId) await markProcessed(eventId);
    await addActivity({ ok: true, type, message: eventId || "accepted", shopDomain });
    return c.json({ received: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "handler failed";
    await addActivity({ ok: false, type, message, shopDomain });
    return c.json({ error: message }, 500);
  }
});

async function handlePaymentPaid(
  data: Record<string, unknown>,
  expectedShop: string,
): Promise<void> {
  const payment = (data.payment as Record<string, unknown> | undefined) ?? data;
  const metadata = (payment.metadata as Record<string, string> | undefined) ?? {};
  const gid = metadata.shopify_payment_gid ?? "";
  const linkId = metadata.paymentLinkId ?? "";
  const session =
    (gid ? await getSession(gid) : null) ??
    (linkId ? await findSessionByPaymentLink(linkId) : null);
  if (!session) return;
  if (normalizeShopDomain(session.shopDomain) !== normalizeShopDomain(expectedShop)) {
    throw new Error("Webhook shop does not match payment session shop");
  }
  const shop = await getShop(session.shopDomain);
  if (!shop?.accessToken) {
    throw new Error(`No Shopify access token for ${session.shopDomain}`);
  }
  await paymentSessionResolve({
    shopDomain: session.shopDomain,
    accessToken: shop.accessToken,
    gid: session.gid,
  });
  await markSession(session.gid, "resolved");
}

const port = Number(process.env.PORT ?? 3458);

async function main() {
  try {
    await ensureSchema();
    console.log("Shopify DB schema ready");
  } catch (err) {
    console.warn("DB schema not ready yet:", err instanceof Error ? err.message : err);
  }
  serve({ fetch: app.fetch, port }, () => {
    console.log(`Autlantic Shopify app listening on :${port}`);
  });
}

void main();

export default app;
