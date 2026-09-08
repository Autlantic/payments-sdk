# Node.js SDK

Official Autlantic Billing **server client** for Node.js / TypeScript.
Part of the [Autlantic Payments SDK](https://github.com/Autlantic/payments-sdk) · [Languages](/guide/languages).

**USDC on Base** · secrets server-only.

`@autlantic/payments-recurring`

## Test vs Live

Hosted mode follows the API key:

- `abk_test_…` → Test · Base Sepolia
- `abk_live_…` → Live · Base mainnet

Use a test key in staging and a live key in production. Webhook secrets come from the matching portal webhook endpoint.

## `AutlanticBilling`

### Factories

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

| Env var | Purpose |
|---------|---------|
| `AUTLANTIC_BILLING_API_URL` | Hosted API base URL |
| `AUTLANTIC_BILLING_API_KEY` | `abk_test_…` or `abk_live_…` |
| `AUTLANTIC_BILLING_MERCHANT_ID` | Merchant id |
| `AUTLANTIC_BILLING_WEBHOOK_SECRET` | Endpoint signing secret for this env |
| `AUTLANTIC_BILLING_SANDBOX` | Optional in-process / local override |
| `AUTLANTIC_BILLING_DEBUG` | Opt-in redacted HTTP / SDK debug logs |
| `AUTLANTIC_BILLING_LOG_LEVEL` | `debug` \| `info` \| `warn` \| `error` |

### Methods

| Method | Description |
|--------|-------------|
| `listProducts()` | List active catalog products and prices (hosted API) |
| `createPayment(input)` | Create one-time USDC payment + `/checkout/pay/:id` |
| `getPayment(id)` | Fetch one-time payment |
| `confirmPayment(id, { txHash? })` | Confirm one-time payment |
| `createPaymentLink(input)` | Create shareable payment link + `/checkout/link/:id` |
| `listPaymentLinks()` | List payment links |
| `getPaymentLink(id)` | Fetch a payment link |
| `disablePaymentLink(id)` | Disable a payment link |
| `openPaymentLink(id, { customerWallet })` | Mint a one-time payment from a link |
| `createSubscription(input)` | Create incomplete subscription + open invoice (`priceId` or `amountUsdc` + `interval`) |
| `listSubscriptions({ status? })` | List merchant subscriptions |
| `getSubscription(id)` | Fetch subscription |
| `updateSubscription(id, input)` | Update amount, interval, plan, metadata |
| `getCheckoutSession(id)` | Fetch hosted checkout session JSON |
| `completeSubscription(id)` | Mark wallet mandate active (no charge) |
| `activateSubscription(id, { onChainSubscriptionId? })` | Complete mandate + first charge |
| `cancelSubscription(id, immediate?)` | Cancel at period end or now |
| `listInvoices({ subscriptionId? })` | List invoices |
| `getInvoice(id)` | Fetch invoice |
| `chargeInvoice(id, sandboxMode?)` | Attempt invoice payment |
| `refundInvoice(id, { amountUsdc? })` | Refund a paid invoice |
| `voidInvoice(id)` | Void an open invoice |

### Payment links

Share a fixed-amount URL (or QR of that URL). The payer opens hosted checkout; USDC settles to your payout wallet.

```ts
const { paymentLink, url } = await billing.createPaymentLink({
  merchantRefPrefix: "invoice",
  payoutAddressEvm: "0xYourMerchantWallet…",
  amountUsdc: 42,
  description: "Consulting",
  maxUses: 1, // optional
});
// Share `url` or encode as QR → /checkout/link/:id
```

Portal merchants can also create links under **Payment links** (URL + QR).

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

Header: `x-autlantic-signature`. Verify with the portal endpoint secret for Test or Live. Argument order: `(secret, rawBody, signatureHeader)`.

Events include `subscription.*`, `invoice.*`, and `payment.created` / `payment.paid` (one-time and payment-link flows).

### Errors and debugging

Throws **`AutlanticBillingError`** (`code`, `type`, `statusCode`, `requestId`). Enable `debug: true` or `AUTLANTIC_BILLING_DEBUG=1` for redacted HTTP traces. Full guide: [Debugging](/guide/debugging).

## Related

- [Languages and SDKs](/guide/languages)
- [Mobile apps](/guide/mobile)
- [Security](/guide/security)
- [Debugging](/guide/debugging)
- [API versioning](/guide/api-versioning)
