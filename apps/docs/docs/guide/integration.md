# 15-minute integration

End-to-end path: **catalog → checkout → webhook → unlock access**. Use Test mode (`abk_test_…`) on Base Sepolia until this works, then switch to Live keys.

## Before you start (2 min)

1. Open [portal.autlantic.com](https://portal.autlantic.com) → **Test** mode  
2. Create a product with a **month** (or **once**) price  
3. Create an API key and a webhook endpoint URL (see [Local webhooks](/guide/local-webhooks))  
4. Copy merchant id, payout wallet, API key, webhook signing secret  

```bash
export AUTLANTIC_BILLING_API_URL=https://billing.autlantic.com
export AUTLANTIC_BILLING_API_KEY=abk_test_…
export AUTLANTIC_BILLING_MERCHANT_ID=mer_…
export AUTLANTIC_BILLING_WEBHOOK_SECRET=whsec_…
export AUTLANTIC_PAYOUT_ADDRESS_EVM=0xYourSettlementWallet
```

```bash
npm install @autlantic/payments-recurring@0.3.3
```

## Path A. Recurring subscription (recommended)

```ts
import {
  AutlanticBilling,
  verifyBillingWebhookDetailed,
  parseBillingWebhookEventDetailed,
} from "@autlantic/payments-recurring";

const billing = AutlanticBilling.fromEnv();

// 1. Catalog
const { products } = await billing.listProducts();
const priceId = products[0]?.prices.find((p) => p.interval === "month")?.id;
if (!priceId) throw new Error("Create a month price in the portal first");

// 2. Create incomplete subscription + hosted checkout
const { subscription, checkoutUrl } = await billing.createSubscription({
  merchantRef: `order_${Date.now()}`,
  customerWallet: memberWallet,
  payoutAddressEvm: process.env.AUTLANTIC_PAYOUT_ADDRESS_EVM!,
  priceId,
});

// 3. Send the member to checkoutUrl (wallet approve + first charge)
// Prefer hosted UI; do not invent your own mandate flow for v1.
```

**Product start CTA (optional):** drop in the ready-made Autlantic chip on your plan card, then link to `checkoutUrl`:

```tsx
import { AutlanticPayButton } from "@autlantic/billing-checkout-ui";
import "@autlantic/billing-checkout-ui/pay-button.css";

<AutlanticPayButton word="SUBSCRIBE" size="lg" fullWidth href={checkoutUrl} />
```

See [Autlantic PAY / SUBSCRIBE button](/guide/autlantic-pay-button).

When checkout finishes you get:

- `subscription.activated` / `invoice.paid` webhooks  
- Member is `active` in the portal under **Customers** / invoices  

**Unlock access** in your webhook handler only after a verified `invoice.paid` (or `subscription.activated`):

```ts
export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-autlantic-signature");

  const verified = verifyBillingWebhookDetailed(
    process.env.AUTLANTIC_BILLING_WEBHOOK_SECRET!,
    rawBody,
    signature,
  );
  if (!verified.ok) return new Response("bad signature", { status: 400 });

  const parsed = parseBillingWebhookEventDetailed(rawBody);
  if (!parsed.ok) return new Response("bad body", { status: 400 });

  if (parsed.event.type === "invoice.paid") {
    await grantAccess(parsed.event.data); // your app
  }
  return new Response("ok");
}
```

## Path B. Payment link (fastest demo)

```ts
const { paymentLink, url } = await billing.createPaymentLink({
  merchantRefPrefix: "demo",
  payoutAddressEvm: process.env.AUTLANTIC_PAYOUT_ADDRESS_EVM!,
  amountUsdc: 5,
  description: "Demo pay",
  maxUses: 1,
  collectEmail: true,
});

// Share `url` or open it yourself on Sepolia
```

Pay in hosted checkout → portal **Payment links** shows opens vs paid → webhook `payment.paid`.

## Checklist

| Step | Done when |
|------|-----------|
| Catalog | `listProducts()` returns your price |
| Checkout | Hosted page loads with Test badge |
| Pay / activate | Invoice or payment is **paid** in portal |
| Webhook | Delivery shows **DELIVERED** HTTP 200 |
| Unlock | Your app grants access only after verify |

## HTTP-only (no Node SDK)

Import [OpenAPI](/api/openapi) or the [Postman collection](/resources/postman). Same flow: `POST /v1/subscriptions` → open `checkoutUrl` → handle webhook.

## Next

- [Local webhooks](/guide/local-webhooks) for tunnels  
- [Debugging](/guide/debugging) for `AUTLANTIC_BILLING_DEBUG=1`  
- [Why Autlantic](/guide/faq) vs card processors  
- Example store: [subscription-store](https://github.com/autlantic/payments-sdk/tree/main/examples/subscription-store)
