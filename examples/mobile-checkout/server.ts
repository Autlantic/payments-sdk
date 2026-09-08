/**
 * Minimal merchant backend for Autlantic mobile Checkout.
 *
 * Flow:
 * 1. App → POST /api/checkout → returns checkoutUrl + deep-link return URLs
 * 2. App opens checkoutUrl via AutlanticCheckout (iOS/Android)
 * 3. Billing → POST /webhooks/autlantic (signed) → grant access
 * 4. App → GET /api/access/:merchantRef → poll entitlement
 *
 * Sandbox (no hosted key):
 *   pnpm --filter @autlantic/example-mobile-checkout start
 *
 * Hosted Test:
 *   AUTLANTIC_BILLING_API_KEY=abk_test_… \
 *   AUTLANTIC_BILLING_API_URL=https://billing.autlantic.com \
 *   AUTLANTIC_BILLING_MERCHANT_ID=mer_… \
 *   AUTLANTIC_BILLING_WEBHOOK_SECRET=whsec_… \
 *   AUTLANTIC_PAYOUT_ADDRESS_EVM=0x… \
 *   pnpm --filter @autlantic/example-mobile-checkout start
 */
import http from "node:http";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  AutlanticBilling,
  parseBillingWebhookEventDetailed,
  verifyBillingWebhookDetailed,
} from "@autlantic/payments-recurring";

const PORT = Number(process.env.PORT ?? 3055);
const RETURN_SCHEME = (process.env.MOBILE_RETURN_SCHEME ?? "myapp").replace(/:\/\/*$/, "");
const SUCCESS_URL = process.env.MOBILE_SUCCESS_URL ?? `${RETURN_SCHEME}://billing/success`;
const CANCEL_URL = process.env.MOBILE_CANCEL_URL ?? `${RETURN_SCHEME}://billing/cancel`;
const PAYOUT =
  process.env.AUTLANTIC_PAYOUT_ADDRESS_EVM?.trim() ||
  "0x1111111111111111111111111111111111111111";
const WEBHOOK_SECRET =
  process.env.AUTLANTIC_BILLING_WEBHOOK_SECRET?.trim() || "whsec_mobile_example";

/** merchantRef → entitlement */
const accessByRef = new Map<string, { active: boolean; updatedAt: string; kind: string }>();

function billingClient(): AutlanticBilling {
  if (process.env.AUTLANTIC_BILLING_API_KEY?.trim()) {
    return AutlanticBilling.fromEnv();
  }
  return AutlanticBilling.sandbox({
    merchantId: process.env.AUTLANTIC_BILLING_MERCHANT_ID?.trim() || "mer_mobile_demo",
    webhookSecret: WEBHOOK_SECRET,
  });
}

function sendJson(res: http.ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

async function readBody(req: http.IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
}

function grant(merchantRef: string, kind: string): void {
  accessByRef.set(merchantRef, {
    active: true,
    updatedAt: new Date().toISOString(),
    kind,
  });
}

export async function handleRequest(
  req: http.IncomingMessage,
  res: http.ServerResponse,
): Promise<void> {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  const path = url.pathname;
  const billing = billingClient();

  if (req.method === "GET" && path === "/health") {
    sendJson(res, 200, {
      ok: true,
      mode: process.env.AUTLANTIC_BILLING_API_KEY ? "hosted" : "sandbox",
      successUrl: SUCCESS_URL,
      cancelUrl: CANCEL_URL,
    });
    return;
  }

  if (req.method === "POST" && path === "/api/checkout") {
    const raw = await readBody(req);
    const body = raw ? (JSON.parse(raw) as {
      kind?: "payment_link" | "subscription" | "payment";
      amountUsdc?: number;
      customerWallet?: string;
      merchantRef?: string;
    }) : {};
    const kind = body.kind ?? "payment_link";
    const amountUsdc = body.amountUsdc ?? 20;
    const merchantRef = body.merchantRef?.trim() || `mobile_${Date.now()}`;
    const customerWallet =
      body.customerWallet?.trim() ||
      "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0";

    accessByRef.set(merchantRef, {
      active: false,
      updatedAt: new Date().toISOString(),
      kind,
    });

    if (kind === "subscription") {
      const created = await billing.createSubscription({
        merchantRef,
        customerWallet,
        payoutAddressEvm: PAYOUT,
        amountUsdc,
        interval: "month",
        successUrl: SUCCESS_URL,
        cancelUrl: CANCEL_URL,
      });
      sendJson(res, 201, {
        kind,
        merchantRef,
        checkoutUrl: created.checkoutUrl,
        subscriptionId: created.subscription.id,
        successUrl: SUCCESS_URL,
        cancelUrl: CANCEL_URL,
      });
      return;
    }

    if (kind === "payment") {
      const created = await billing.createPayment({
        merchantRef,
        customerWallet,
        payoutAddressEvm: PAYOUT,
        amountUsdc,
        successUrl: SUCCESS_URL,
        cancelUrl: CANCEL_URL,
      });
      sendJson(res, 201, {
        kind,
        merchantRef,
        checkoutUrl: created.checkoutUrl,
        paymentId: created.payment.id,
        successUrl: SUCCESS_URL,
        cancelUrl: CANCEL_URL,
      });
      return;
    }

    const created = await billing.createPaymentLink({
      merchantRefPrefix: merchantRef,
      payoutAddressEvm: PAYOUT,
      amountUsdc,
      description: "Mobile checkout demo",
      maxUses: 1,
      successUrl: SUCCESS_URL,
      cancelUrl: CANCEL_URL,
    });
    sendJson(res, 201, {
      kind: "payment_link",
      merchantRef,
      checkoutUrl: created.url,
      paymentLinkId: created.paymentLink.id,
      successUrl: SUCCESS_URL,
      cancelUrl: CANCEL_URL,
    });
    return;
  }

  if (req.method === "GET" && path.startsWith("/api/access/")) {
    const merchantRef = decodeURIComponent(path.slice("/api/access/".length));
    const row = accessByRef.get(merchantRef);
    if (!row) {
      sendJson(res, 404, { error: "Unknown merchantRef" });
      return;
    }
    sendJson(res, 200, { merchantRef, ...row });
    return;
  }

  if (req.method === "POST" && path === "/webhooks/autlantic") {
    const rawBody = await readBody(req);
    const signature = req.headers["x-autlantic-signature"];
    const verified = verifyBillingWebhookDetailed(
      WEBHOOK_SECRET,
      rawBody,
      typeof signature === "string" ? signature : null,
    );
    if (!verified.ok) {
      sendJson(res, 400, { error: "bad signature", reason: verified.reason });
      return;
    }
    const parsed = parseBillingWebhookEventDetailed(rawBody);
    if (!parsed.ok) {
      sendJson(res, 400, { error: "bad body", reason: parsed.reason });
      return;
    }

    const event = parsed.event;
    const data = event.data as Record<string, unknown>;
    const merchantRef =
      (typeof data.merchantRef === "string" && data.merchantRef) ||
      (typeof data.merchant_ref === "string" && data.merchant_ref) ||
      null;

    if (
      merchantRef &&
      (event.type === "invoice.paid" ||
        event.type === "payment.paid" ||
        event.type === "subscription.activated")
    ) {
      grant(merchantRef, event.type);
    }

    sendJson(res, 200, { received: true, type: event.type });
    return;
  }

  sendJson(res, 404, { error: "Not found" });
}

const isMain =
  Boolean(process.argv[1]) &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1]!)).href;

if (isMain) {
  const server = http.createServer((req, res) => {
    handleRequest(req, res).catch((err) => {
      console.error(err);
      sendJson(res, 500, { error: "Internal error" });
    });
  });
  server.listen(PORT, () => {
    console.log(`[mobile-checkout example] http://localhost:${PORT}`);
    console.log(`  POST /api/checkout`);
    console.log(`  GET  /api/access/:merchantRef`);
    console.log(`  POST /webhooks/autlantic`);
    console.log(`  return URLs: ${SUCCESS_URL} | ${CANCEL_URL}`);
  });
}
