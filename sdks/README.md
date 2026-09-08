<p align="center">
  <img src="https://autlantic.com/brand/autlantic-icon-1024-master.png" alt="Autlantic" width="96" height="96" />
</p>

<h1 align="center">Autlantic Billing — SDKs</h1>

<p align="center">
  <strong>USDC payments on Base</strong><br />
  Official clients for the same hosted Billing API. Server SDKs hold secrets; mobile Checkout only presents hosted URLs.
</p>

<p align="center">
  <a href="https://docs.autlantic.com/guide/languages"><img src="https://img.shields.io/badge/docs-docs.autlantic.com-5672cd?style=flat-square" alt="Docs" /></a>
  <a href="https://github.com/Autlantic/payments-sdk/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="MIT License" /></a>
  <a href="https://autlantic.com"><img src="https://img.shields.io/badge/product-autlantic.com-111827?style=flat-square" alt="Autlantic" /></a>
</p>

---

Stripe-style clients for the **same** hosted Billing API (`https://billing.autlantic.com`). The Node reference implementation is [`@autlantic/payments-recurring`](../packages/payments-recurring) under `packages/`.

README layout for every package: **[README.STANDARD.md](./README.STANDARD.md)**.

## Matrix

| Surface | Status | Package / artifact | Secrets |
|---------|--------|--------------------|---------|
| **Hosted HTTP API** | Available | [OpenAPI](https://docs.autlantic.com/api/openapi) · `https://billing.autlantic.com` | Server API key |
| **Node.js / TypeScript** | Available | [`@autlantic/payments-recurring`](https://www.npmjs.com/package/@autlantic/payments-recurring) **0.3.12** | Server only |
| **Python** | Available | [`autlantic-billing`](./python) · [PyPI](https://pypi.org/project/autlantic-billing/) **0.1.0** | Server only |
| **Go** | Available | [`sdks/go`](./go) tag `sdks/go/v0.1.0` | Server only |
| **PHP** | Available (Composer) | [`autlantic/billing`](./php) · [billing-php](https://github.com/Autlantic/billing-php) · Packagist pending | Server only |
| **Java** | Available on Maven Central | [`com.autlantic:billing`](https://central.sonatype.com/artifact/com.autlantic/billing) **0.1.1** | Server only |
| **.NET** | Available on NuGet | [`Autlantic.Billing`](https://www.nuget.org/packages/Autlantic.Billing) **0.1.0** | Server only |
| **iOS (Swift)** | Available (SPM) | [`AutlanticCheckout`](./ios) tag `sdks/ios/v0.1.0` | **None** |
| **Android (Kotlin)** | Available on Maven Central | [`com.autlantic:checkout`](https://central.sonatype.com/artifact/com.autlantic/checkout) **0.1.0** | **None** |
| **Flutter** | Available on pub.dev | [`autlantic_checkout`](https://pub.dev/packages/autlantic_checkout) **0.1.0** | **None** |
| **React Native** | Available on npm | [`@autlantic/checkout`](https://www.npmjs.com/package/@autlantic/checkout) **0.1.0** | **None** |

## Who installs what

```text
Merchant backend  →  Node / Python / Go / PHP / Java / .NET SDK  →  billing-api (/v1 + webhooks)
Merchant mobile   →  iOS / Android / Flutter / RN Checkout  →  opens hosted checkoutUrl
```

- **Server SDKs** create subscriptions, payments, and payment links; verify webhooks; unlock access.
- **Mobile SDKs** only present the hosted checkout URL and handle return deep links. They never accept `abk_*` keys or webhook secrets.

## Rules

1. Server SDKs call `/v1/*` only. Send `Autlantic-Version`, `Idempotency-Key` on POSTs, and a clear `User-Agent`.
2. Mobile SDKs only present hosted `checkoutUrl` / payment-link `url` and handle return deep links.
3. Do not port in-process `AutlanticBilling.sandbox()` / `billing-engine` into these languages. Test mode uses `abk_test_*` against the hosted API.
4. Hand-write webhook verification to match `packages/payments-recurring/src/webhook.ts`.
5. Publish packages before Autlantic platform (or any merchant) depends on them.

## Docs

| | |
|--|--|
| [Languages](https://docs.autlantic.com/guide/languages) | Matrix & who installs what |
| [Mobile apps](https://docs.autlantic.com/guide/mobile) | Checkout presenters |
| [API versioning](https://docs.autlantic.com/guide/api-versioning) | `Autlantic-Version` |
| [Publishing](./PUBLISHING.md) | Maintainer release steps |

## License

MIT · Operated by **Autlantic Limited** (UK company no. 17422039).

Part of [Autlantic Payments SDK](https://github.com/Autlantic/payments-sdk).
