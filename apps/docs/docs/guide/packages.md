# Packages

| Package | Role |
|---------|------|
| `@autlantic/payments-recurring` | Merchant SDK (subscriptions, one-time payments, payment links, webhooks) |
| `@autlantic/payments-recurring-core` | Types, intervals, retry policy |
| `@autlantic/chain-evm` | Base + USDC + vault + preflight |
| `@autlantic/billing-engine` | Subscriptions, invoices, payment links, refunds, webhook dispatch |

Most integrators only install `@autlantic/payments-recurring`. The other packages are available if you need lower-level types or chain helpers.

Official **Python / Go / PHP / Java / .NET** server clients and **iOS / Android / Flutter / React Native** Checkout SDKs live under [`sdks/`](https://github.com/Autlantic/payments-sdk/tree/main/sdks). Published: npm (`@autlantic/payments-recurring`, `@autlantic/checkout`), PyPI (`autlantic-billing`), NuGet (`Autlantic.Billing`), Maven Central (`com.autlantic:billing`, `com.autlantic:checkout`), pub.dev (`autlantic_checkout`), Go and iOS Git tags; PHP via [`billing-php`](https://github.com/Autlantic/billing-php) (Packagist pending). See [Languages and SDKs](/guide/languages) and [Mobile apps](/guide/mobile).

## Spec

Internal product/architecture notes live in the monorepo at `docs/recurring-payments-spec.md`.
