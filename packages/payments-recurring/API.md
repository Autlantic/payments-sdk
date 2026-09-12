# API reference - @autlantic/payments-recurring

## Test vs Live

For the hosted billing API, **mode comes from the API key**:

- `abk_test_…` → Test data plane, Base Sepolia, hosted checkout shows **Test**
- `abk_live_…` → Live data plane, Base mainnet, hosted checkout shows **Live**

Use a test key in staging and a live key in production (same env var names, different values). Webhook verification should use the signing secret from the matching Test or Live webhook endpoint in the portal. Register your app URL under portal → Webhooks; there is no `AUTLANTIC_BILLING_WEBHOOK_URL` delivery env.

`AutlanticBilling.fromEnv()` sets `sandbox` from the API key the same way:

- test key → sandbox `true`
- live key → sandbox `false`, unless `AUTLANTIC_BILLING_ALLOW_LIVE_SANDBOX=true` (break-glass only)

Do not use `AUTLANTIC_BILLING_SANDBOX` as the Test/Live switch. Prefer `AutlanticBilling.sandbox({…})` for in-process demos with no API URL.

## `AutlanticBilling`

### Constructor / factories

```ts
new AutlanticBilling({
  apiBaseUrl?: string;
  apiKey?: string;
  merchantId: string;
  sandbox?: boolean;
  webhookSecret?: string;
  debug?: boolean;
  logLevel?: "debug" | "info" | "warn" | "error";
  logger?: BillingLogger;
});

AutlanticBilling.sandbox({ merchantId, webhookSecret?, debug?, logger? });
AutlanticBilling.fromEnv();
```

Helpers:

- `billingModeFromApiKey(apiKey)` → `"test" | "live"`
- `sandboxFromApiKeyAndEnv(apiKey, env?)` → boolean

Env vars:

| Variable | Purpose |
|----------|---------|
| `AUTLANTIC_BILLING_API_URL` | Hosted API base URL |
| `AUTLANTIC_BILLING_API_KEY` | `abk_test_…` or `abk_live_…` (mode source of truth) |
| `AUTLANTIC_BILLING_MERCHANT_ID` | Merchant id |
| `AUTLANTIC_BILLING_WEBHOOK_SECRET` | Endpoint signing secret for this env |
| `AUTLANTIC_BILLING_ALLOW_LIVE_SANDBOX` | Break-glass fake charges with a live key (prefer unset) |
| `AUTLANTIC_BILLING_DEBUG` | `1` / `true` enables redacted HTTP + SDK debug logs |
| `AUTLANTIC_BILLING_LOG_LEVEL` | `debug` \| `info` \| `warn` \| `error` |

### Methods

| Method | Description |
|--------|-------------|
| `createPayment(input)` | Create one-time USDC payment + hosted `/checkout/pay/:id` |
| `createPaymentLink(input)` | Create shareable payment link + `/checkout/link/:id` (URL / QR) |
| `listPaymentLinks()` | List payment links for the merchant |
| `getPaymentLink(id)` | Fetch a payment link |
| `disablePaymentLink(id)` | Disable a payment link |
| `openPaymentLink(id, { customerWallet })` | Mint a one-time payment from a link |
| `listProducts({ includeInactive? })` | List catalog products and prices (hosted API, scoped to key mode) |
| `createProduct(input)` | Create catalog product (optional nested price) |
| `updateProduct(id, input)` | Update catalog product name / description / active / metadata |
| `createPrice(productId, input)` | Create a price on a product |
| `updatePrice(priceId, input)` | Update price amount / interval / trial / active |
| `listCoupons({ includeInactive? })` | List merchant coupons (hosted API) |
| `createCoupon(input)` | Create coupon (percent or fixed USDC off; optional scopeKey/metadata) |
| `updateCoupon(id, input)` | Update coupon fields / active |
| `deleteCoupon(id)` | Delete coupon |
| `createSubscription(input)` | Create incomplete subscription + open invoice (`priceId` or `amountUsdc` + `interval`) |
| `listSubscriptions({ status? })` | List merchant subscriptions (key mode) |
| `getSubscription(id)` | Fetch subscription |
| `updateSubscription(id, input)` | Update amount, interval, plan, metadata |
| `getCheckoutSession(id)` | Fetch hosted checkout session JSON |
| `completeSubscription(id)` | Mark wallet mandate active (no charge) |
| `activateSubscription(id, { onChainSubscriptionId? })` | Complete mandate + first charge (test or live) |
| `cancelSubscription(id, immediate?)` | Cancel at period end or now (+ on-chain cancel via API) |
| `resumeSubscription(id)` | Undo cancel-at-period-end so renewals continue |
| `listInvoices({ subscriptionId? })` | List invoices (key mode) |
| `getInvoice(id)` | Fetch invoice |
| `chargeInvoice(id, sandboxMode?)` | Attempt invoice payment |
| `refundInvoice(id, { amountUsdc? })` | Refund a paid invoice |
| `voidInvoice(id)` | Void an open invoice |

### Webhooks

```ts
import {
  signBillingWebhook,
  verifyBillingWebhook,
  verifyBillingWebhookDetailed,
  parseBillingWebhookEvent,
  parseBillingWebhookEventDetailed,
  assertBillingWebhook,
} from "@autlantic/payments-recurring";
```

Header: `x-autlantic-signature`

Events: `subscription.*`, `invoice.paid`, `invoice.payment_failed`, `invoice.refunded`, `invoice.voided`, `payment.*`

Verify with the **endpoint** secret from the portal for that mode. Argument order: `(secret, rawBody, signatureHeader)`.

### Errors and logging

```ts
import {
  AutlanticBillingError,
  createConsoleBillingLogger,
} from "@autlantic/payments-recurring";
```

See [Debugging](https://docs.autlantic.com/guide/debugging).

### Idempotency

Pass `Idempotency-Key` on POST requests to the billing API. Replays return the cached response for 24 hours.

## Hosted billing API

Public docs: https://docs.autlantic.com/api/http

Public checkout (no API key; Test/Live from the session):

- `GET /checkout/subscribe/:id` — hosted HTML
- `GET /checkout/subscribe/:id.json` — session JSON
- `POST /checkout/subscribe/:id/activate` — test or live (live requires `{ onChainSubscriptionId }`)
- `GET /checkout/pay/:id` — one-time payment checkout
- `GET /checkout/link/:id` — payment link landing (opens into `/checkout/pay/:id`)
- `GET /checkout/link/:id/status` — link status JSON
- `POST /checkout/link/:id/open` — mint payment from link (`{ customerWallet? }`)

Authenticated (`X-Autlantic-Api-Key` / `x-autlantic-api-key`):

- `GET /v1/products` — list (`?includeInactive=1` to include inactive)
- `POST /v1/products` — create product (optional nested `price`)
- `PATCH /v1/products/:id` — update product
- `POST /v1/products/:id/prices` — create price
- `PATCH /v1/prices/:id` — update price
- `POST /v1/payments` — create one-time payment
- `GET /v1/payments/:id`
- `POST /v1/payment-links` — create shareable payment link
- `GET /v1/payment-links` — list
- `GET /v1/payment-links/:id`
- `POST /v1/payment-links/:id/disable`
- `POST /v1/subscriptions` — create
- `GET /v1/subscriptions` — list (`?status=active`)
- `GET /v1/subscriptions/:id`
- `PATCH /v1/subscriptions/:id` — update plan/amount
- `POST /v1/subscriptions/:id/complete`
- `POST /v1/subscriptions/:id/activate` — live activate with `{ onChainSubscriptionId }`
- `POST /v1/subscriptions/:id/cancel`
- `GET /v1/invoices` — list (`?subscriptionId=`)
- `GET /v1/invoices/:id`
- `POST /v1/invoices/:id/charge`
- `POST /v1/invoices/:id/refund`
- `POST /v1/invoices/:id/void`
