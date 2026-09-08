<p align="center">
  <img src="https://autlantic.com/brand/autlantic-icon-1024-master.png" alt="Autlantic" width="96" height="96" />
</p>

<h1 align="center">Autlantic Payments SDK</h1>

<p align="center">
  <strong>USDC payments on Base</strong><br />
  TypeScript SDK for subscriptions, one-time payments, payment links, invoices, webhooks, and sandbox testing.
</p>

<p align="center">
  <a href="https://docs.autlantic.com"><img src="https://img.shields.io/badge/docs-docs.autlantic.com-5672cd?style=flat-square" alt="Docs" /></a>
  <a href="https://www.npmjs.com/package/@autlantic/payments-recurring"><img src="https://img.shields.io/npm/v/@autlantic/payments-recurring?style=flat-square&color=5672cd" alt="npm" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="MIT License" /></a>
  <a href="https://autlantic.com"><img src="https://img.shields.io/badge/product-autlantic.com-111827?style=flat-square" alt="Autlantic" /></a>
</p>

---

## Why this SDK

Autlantic Billing is the same engine that powers [Autlantic](https://autlantic.com) creator memberships:

- Recurring **USDC** charges, **one-time** transfers, and shareable **payment links** on **Base**
- Direct settlement to the merchant `payoutAddressEvm` (Autlantic does not custody subscription revenue)
- Relayers sponsor gas and submit transactions; they do not hold member balances
- [Non-custodial overview](https://autlantic.com/non-custodial) · [Security](https://autlantic.com/security)
- Typed Node client, signed webhooks, and an in-process sandbox
- Optional hosted HTTP API for non-Node stacks

## Quick start

```bash
npm install @autlantic/payments-recurring
```

Requires **Node.js 20+**.

```ts
import { AutlanticBilling } from "@autlantic/payments-recurring";

const billing = AutlanticBilling.sandbox({ merchantId: "mer_demo" });

// Payment link (share URL / QR)
const { url } = await billing.createPaymentLink({
  merchantRefPrefix: "invoice",
  payoutAddressEvm: "0xYourMerchantWallet",
  amountUsdc: 42,
  description: "Consulting",
});

// Or subscription
const { subscription } = await billing.createSubscription({
  merchantRef: "order_123",
  customerWallet: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0",
  payoutAddressEvm: "0xYourMerchantWallet",
  amountUsdc: 20,
  interval: "month",
});

// Completes the mandate and charges the first open invoice.
const { charge } = await billing.activateSubscription(subscription.id);

if (charge?.invoice.status === "paid") {
  // Unlock access for your customer
}
```

Full guides: [docs.autlantic.com](https://docs.autlantic.com)

## Packages

| Package | Description |
|---------|-------------|
| [`@autlantic/payments-recurring`](./packages/payments-recurring) | Merchant client: subscriptions, one-time payments, payment links, webhooks |
| [`@autlantic/payments-recurring-core`](./packages/payments-recurring-core) | Shared types, intervals, retry policy |
| [`@autlantic/chain-evm`](./packages/chain-evm) | Base + USDC + vault helpers |
| [`@autlantic/billing-engine`](./packages/billing-engine) | Subscription, invoice, and payment-link engine |

Most integrators only need `@autlantic/payments-recurring`.

Official non-TypeScript and mobile Checkout SDKs live under [`sdks/`](./sdks) (Python, Go, PHP, iOS, Android). See [Languages and SDKs](https://docs.autlantic.com/guide/languages).

## Features

- **Sandbox first.** `AutlanticBilling.sandbox()` for local demos without mainnet funds
- **Hosted or in-process.** Call your billing API, or run the engine in memory for tests
- **Webhooks.** Register your URL in the merchant portal (Test/Live). Events are signed with the endpoint secret (`x-autlantic-signature`); SDK helpers verify and parse
- **Idempotent writes.** SDK sends `Idempotency-Key` on POST requests to the hosted API

## Documentation

| Resource | Link |
|----------|------|
| Getting started | https://docs.autlantic.com/guide/getting-started |
| Node.js API | https://docs.autlantic.com/api/nodejs |
| Hosted HTTP API | https://docs.autlantic.com/api/http |
| Webhooks | https://docs.autlantic.com/guide/webhooks |
| About | https://autlantic.com/about |
| Press & media | https://autlantic.com/press |
| Terms of Service | https://autlantic.com/terms |
| Privacy Policy | https://autlantic.com/privacy |
| Billing Terms (portal) | https://portal.autlantic.com/terms |
| Non-custodial overview | https://autlantic.com/non-custodial |
| Product security | https://autlantic.com/security |
| Security (repo) | [SECURITY.md](./SECURITY.md) |
| Publishing | [PUBLISHING.md](./PUBLISHING.md) |

## Develop in this repo

```bash
pnpm install
pnpm check      # build + test all packages
pnpm example    # sandbox CLI demo
pnpm example:store  # Next.js example storefront (http://localhost:3040)
pnpm dev:docs   # local VitePress docs
```

## Example store

See [`examples/subscription-store`](./examples/subscription-store) for a runnable shop with **both**:

- **One-time** USDC payments (`@autlantic/chain-evm`)
- **Recurring** subscriptions (`@autlantic/payments-recurring`)

```bash
pnpm example:store
# http://localhost:3040  →  /one-time  and  /recurring
```

## Security

Please report vulnerabilities privately. See [SECURITY.md](./SECURITY.md).

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) and our [Code of Conduct](./CODE_OF_CONDUCT.md).

## Brand

Official marks live on the product CDN:

- Icon: https://autlantic.com/brand/autlantic-icon-1024-master.png
- Wordmark: https://autlantic.com/brand/autlantic-wordmark-800-light.png

Do not use Autlantic branding to imply endorsement. See [SECURITY.md](./SECURITY.md#brand-and-trademarks).

## License

This software is licensed under the [MIT License](./LICENSE).

Copyright © 2026 Autlantic Limited (UK company no. 17422039). All rights reserved for trademarks and brand assets; the MIT License covers the source code in this repository.

## Links

- Product: [autlantic.com](https://autlantic.com)
- About: [autlantic.com/about](https://autlantic.com/about)
- Press & media: [autlantic.com/press](https://autlantic.com/press)
- Docs: [docs.autlantic.com](https://docs.autlantic.com)
- GitHub: [github.com/Autlantic/payments-sdk](https://github.com/Autlantic/payments-sdk)
- npm: [@autlantic/payments-recurring](https://www.npmjs.com/package/@autlantic/payments-recurring)
- Support: [support@autlantic.com](mailto:support@autlantic.com)
