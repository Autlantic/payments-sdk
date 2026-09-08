---
layout: home

hero:
  name: Autlantic Billing
  text: USDC on Base
  tagline: TypeScript SDK and hosted API for USDC subscriptions, one-time payments, and shareable payment links. Non-custodial settlement to your EVM wallet. Test and Live keys.
  actions:
    - theme: brand
      text: Get started
      link: /guide/getting-started
    - theme: alt
      text: npm package
      link: https://www.npmjs.com/package/@autlantic/payments-recurring
    - theme: alt
      text: Autlantic product
      link: https://autlantic.com

features:
  - title: npm SDK
    details: "@autlantic/payments-recurring: subscriptions, one-time payments, payment links, refunds, and webhooks. TypeScript, Node 20+."
  - title: Payment links
    details: "Fixed-amount shareable URL and QR. Payer opens hosted checkout; USDC settles to your wallet."
  - title: Hosted API
    details: "REST with API key when you do not want Node in your stack. Same billing engine as the SDK."
  - title: Test and Live
    details: "abk_test_ keys on Base Sepolia, abk_live_ keys on Base mainnet. Same Test / Live split as the merchant portal."
---

## Ways to integrate

| Mode | Best for |
|------|----------|
| **npm SDK** | Node backends, in-process sandbox, full control |
| **Hosted HTTP API** | Any server stack (curl, Python, Go, PHP), API key only |
| **Mobile Checkout** | iOS / Android apps: open `checkoutUrl`; no API keys in the app ([guide](/guide/mobile)) |

Language matrix: [Languages and SDKs](/guide/languages). API pin: [API versioning](/guide/api-versioning) (`Autlantic-Version: 2026-01-01`).

```bash
npm install @autlantic/payments-recurring
```

```ts
import { AutlanticBilling } from "@autlantic/payments-recurring";

// Hosted: set AUTLANTIC_BILLING_API_KEY to abk_test_… or abk_live_…
const billing = AutlanticBilling.fromEnv();

// Or local in-process demo:
// const billing = AutlanticBilling.sandbox({ merchantId: "mer_demo" });

const { url } = await billing.createPaymentLink({
  merchantRefPrefix: "invoice",
  payoutAddressEvm: "0xYourMerchantWallet…",
  amountUsdc: 42,
  description: "Consulting",
});
// Share url or QR → /checkout/link/:id
```

See [Getting started](/guide/getting-started) for subscriptions, one-time pay, and payment links.
