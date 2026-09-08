---
layout: home

hero:
  name: Autlantic Billing
  text: USDC on Base
  tagline: TypeScript, Python, and Go server SDKs plus iOS/Android Checkout. Hosted API for USDC subscriptions, one-time payments, and payment links. Non-custodial settlement to your EVM wallet.
  actions:
    - theme: brand
      text: Get started
      link: /guide/getting-started
    - theme: alt
      text: Languages
      link: /guide/languages
    - theme: alt
      text: Autlantic product
      link: https://autlantic.com

features:
  - title: Server SDKs
    details: "Node (npm), Python (PyPI), and Go. Subscriptions, payment links, webhooks. Same hosted Billing API."
  - title: Mobile Checkout
    details: "iOS (SPM) and Android present hosted checkoutUrl. No API keys in the app."
  - title: Hosted API
    details: "REST with API key for any stack. OpenAPI, Autlantic-Version pin, Test and Live keys."
  - title: Payment links
    details: "Fixed-amount shareable URL and QR. Payer opens hosted checkout; USDC settles to your wallet."
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
