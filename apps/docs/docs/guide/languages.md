# Languages and SDKs

Autlantic Billing is **one hosted API**. Official SDKs are thin clients around that API (Stripe-style). They are not separate billing backends. Package READMEs and API pages share the branding layout in [`sdks/README.STANDARD.md`](https://github.com/Autlantic/payments-sdk/blob/main/sdks/README.STANDARD.md).

## Matrix

| Surface | Status | Package / artifact | Secrets |
|---------|--------|--------------------|---------|
| **Hosted HTTP API** | Available | [OpenAPI](/api/openapi) · `https://billing.autlantic.com` | Server API key |
| **Node.js / TypeScript** | Available | [`@autlantic/payments-recurring`](https://www.npmjs.com/package/@autlantic/payments-recurring) **0.3.12** | Server only |
| **Python** | Available | [`autlantic-billing`](https://pypi.org/project/autlantic-billing/) **0.1.0** on PyPI | Server only |
| **Go** | Available | [`github.com/Autlantic/payments-sdk/sdks/go`](https://github.com/Autlantic/payments-sdk/tree/main/sdks/go) tag `sdks/go/v0.1.0` | Server only |
| **PHP** | Available on Packagist | [`autlantic/billing`](https://packagist.org/packages/autlantic/billing) **0.1.0** | Server only |
| **Java** | Available on Maven Central | [`com.autlantic:billing`](https://central.sonatype.com/artifact/com.autlantic/billing) **0.1.1** | Server only |
| **.NET** | Available on NuGet | [`Autlantic.Billing`](https://www.nuget.org/packages/Autlantic.Billing) **0.1.0** | Server only |
| **iOS (Swift)** | Available (SPM) | [`AutlanticCheckout`](https://github.com/Autlantic/payments-sdk/tree/main/sdks/ios) tag `sdks/ios/v0.1.0` | **None** |
| **Android (Kotlin)** | Available on Maven Central | [`com.autlantic:checkout`](https://central.sonatype.com/artifact/com.autlantic/checkout) **0.1.0** | **None** |
| **Flutter** | Available on pub.dev | [`autlantic_checkout`](https://pub.dev/packages/autlantic_checkout) **0.1.0** | **None** |
| **React Native** | Available on npm | [`@autlantic/checkout`](https://www.npmjs.com/package/@autlantic/checkout) **0.1.0** | **None** |
| **WooCommerce** | Available (plugin zip) | [`woocommerce-autlantic`](https://github.com/Autlantic/woocommerce-autlantic) releases | Server API key + webhook secret |
| **Magento 2** | Available (Composer module) | [`autlantic/module-billing`](https://github.com/Autlantic/magento-autlantic) **1.0.0** | Server API key + webhook secret |
| **Shopify** | Available (app source; Payments Partner approval for checkout) | [`shopify-autlantic`](https://github.com/Autlantic/shopify-autlantic) | Server API key + webhook secret + Shopify app credentials |

## Who installs what

```text
Merchant backend  →  Node / Python / Go / PHP / Java / .NET SDK  →  billing-api (/v1 + webhooks)
Merchant mobile   →  iOS / Android / Flutter / RN Checkout  →  opens hosted checkoutUrl
WooCommerce store →  Autlantic Billing plugin  →  PHP SDK → billing-api + webhooks
Magento store     →  Autlantic Billing module  →  PHP SDK → billing-api + webhooks
Shopify store     →  Autlantic Billing app     →  Node SDK → billing-api + webhooks
```

- **Server SDKs** create subscriptions, payments, and payment links; verify webhooks; unlock access.
- **Mobile SDKs** only present the hosted checkout URL and handle return deep links. They never accept `abk_*` keys or webhook secrets.
- **Commerce plugins** are full gateways / payment methods (not language SDKs). See [Commerce plugins](/guide/commerce).

## Docs by platform

| Platform | Guide |
|----------|--------|
| Node | [Node.js SDK](/api/nodejs) |
| Python | [Python SDK](/api/python) |
| Go | [Go SDK](/api/go) |
| PHP | [PHP SDK](/api/php) |
| Java | [Java SDK](/api/java) |
| .NET | [.NET SDK](/api/dotnet) |
| iOS | [iOS Checkout](/api/ios) · [Mobile apps](/guide/mobile) |
| Android | [Android Checkout](/api/android) · [Mobile apps](/guide/mobile) |
| Flutter | [Flutter Checkout](/api/flutter) · [Mobile apps](/guide/mobile) |
| React Native | [React Native Checkout](/api/react-native) · [Mobile apps](/guide/mobile) |
| WooCommerce / Magento / Shopify | [Commerce plugins](/guide/commerce) |
| Any language | [Hosted HTTP API](/api/http) · [OpenAPI](/api/openapi) |

## Related

- [Commerce plugins](/guide/commerce)
- [Mobile apps](/guide/mobile)
- [API versioning](/guide/api-versioning)
- [15-minute integration](/guide/integration)
- [Security](/guide/security)
