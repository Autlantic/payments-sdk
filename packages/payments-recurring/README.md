<p align="center">
  <img src="https://autlantic.com/brand/autlantic-icon-1024-master.png" alt="Autlantic" width="96" height="96" />
</p>

<h1 align="center">Autlantic Billing — Node.js</h1>

<p align="center">
  <strong>USDC payments on Base</strong><br />
  Official TypeScript server client for subscriptions, one-time payments, payment links, and webhooks.
</p>

<p align="center">
  <a href="https://docs.autlantic.com/api/nodejs"><img src="https://img.shields.io/badge/docs-docs.autlantic.com-5672cd?style=flat-square" alt="Docs" /></a>
  <a href="https://www.npmjs.com/package/@autlantic/payments-recurring"><img src="https://img.shields.io/npm/v/@autlantic/payments-recurring?style=flat-square&color=5672cd" alt="npm" /></a>
  <a href="https://github.com/Autlantic/payments-sdk/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="MIT License" /></a>
  <a href="https://autlantic.com"><img src="https://img.shields.io/badge/product-autlantic.com-111827?style=flat-square" alt="Autlantic" /></a>
</p>

---

USDC settles to your merchant `payoutAddressEvm`. Autlantic does not custody subscription revenue. Relayers sponsor gas and submit transactions; they do not hold member balances.

- Docs: https://docs.autlantic.com  
- About: https://autlantic.com/about  
- Terms: https://autlantic.com/terms  
- Privacy: https://autlantic.com/privacy  
- Billing Terms: https://portal.autlantic.com/terms  
- Non-custodial: https://autlantic.com/non-custodial  
- Security: https://autlantic.com/security  

## Install

```bash
npm install @autlantic/payments-recurring
```

## Test vs Live (hosted API)

Mode follows your API key (Test vs Live):

| Key | Environment |
|-----|-------------|
| `abk_test_…` | Test · Base Sepolia |
| `abk_live_…` | Live · Base mainnet |

```bash
# Staging
AUTLANTIC_BILLING_API_URL=https://billing.autlantic.com
AUTLANTIC_BILLING_API_KEY=abk_test_…
AUTLANTIC_BILLING_MERCHANT_ID=mer_…
AUTLANTIC_BILLING_WEBHOOK_SECRET=whsec_…   # Test webhook endpoint secret

# Production: same vars, live key + Live endpoint secret
```

Create keys and webhook endpoints in the merchant portal under Test or Live. Use one key per deploy.

Billing POSTs events to **portal webhook endpoints** only (signed with that endpoint’s secret). Put the matching secret in `AUTLANTIC_BILLING_WEBHOOK_SECRET`. There is no global `AUTLANTIC_BILLING_WEBHOOK_URL` env for delivery.

```ts
import { AutlanticBilling } from "@autlantic/payments-recurring";

const billing = AutlanticBilling.fromEnv();

const { products } = await billing.listProducts();
const { subscription, checkoutUrl } = await billing.createSubscription({
  merchantRef: "order_123",
  customerWallet: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0",
  priceId: products[0]?.prices[0]?.id,
});
```

Payment link (share URL or QR; payer wallet collected at checkout):

```ts
const { paymentLink, url } = await billing.createPaymentLink({
  merchantRefPrefix: "invoice",
  payoutAddressEvm: "0xYourMerchantWallet…",
  amountUsdc: 42,
  description: "Consulting",
});
// url → /checkout/link/:id
```

## Quickstart (in-process sandbox)

No hosted API required. Useful for local demos:

```ts
import { AutlanticBilling } from "@autlantic/payments-recurring";

const billing = AutlanticBilling.sandbox({ merchantId: "mer_demo" });

const { subscription } = await billing.createSubscription({
  merchantRef: "order_123",
  customerWallet: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0",
  payoutAddressEvm: "0xYourMerchantWallet…",
  amountUsdc: 20,
  interval: "month",
});

const { charge } = await billing.activateSubscription(subscription.id);
```

## Hosted API

Point `AUTLANTIC_BILLING_API_URL` at your billing API. Mode, chain, and checkout badge come from the API key. See [API.md](./API.md) and https://docs.autlantic.com/guide/sandbox.

## License

MIT · Operated by **Autlantic Limited** (UK company no. 17422039).

Part of [Autlantic Payments SDK](https://github.com/Autlantic/payments-sdk).
