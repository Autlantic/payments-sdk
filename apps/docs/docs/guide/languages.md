# Languages and SDKs

Autlantic Billing is **one hosted API**. Official SDKs are thin clients around that API (Stripe-style). They are not separate billing backends.

## Matrix

| Surface | Status | Package / artifact | Secrets |
|---------|--------|--------------------|---------|
| **Hosted HTTP API** | Available | [OpenAPI](/api/openapi) · `https://billing.autlantic.com` | Server API key |
| **Node.js / TypeScript** | Available | [`@autlantic/payments-recurring`](https://www.npmjs.com/package/@autlantic/payments-recurring) **0.3.12** | Server only |
| **Python** | Available | [`autlantic-billing`](https://pypi.org/project/autlantic-billing/) **0.1.0** on PyPI | Server only |
| **Go** | Available | [`github.com/Autlantic/payments-sdk/sdks/go`](https://github.com/Autlantic/payments-sdk/tree/main/sdks/go) tag `sdks/go/v0.1.0` | Server only |
| **PHP** | Available (Composer) | [`autlantic/billing`](https://github.com/Autlantic/billing-php) · Packagist pending submit | Server only |
| **Java** | Available (source) | [`sdks/java`](https://github.com/Autlantic/payments-sdk/tree/main/sdks/java) (`com.autlantic:billing`; Maven Central with Android namespace) | Server only |
| **.NET** | Available (source) | [`sdks/dotnet`](https://github.com/Autlantic/payments-sdk/tree/main/sdks/dotnet) (`Autlantic.Billing`; NuGet later) | Server only |
| **iOS (Swift)** | Available (SPM) | [`AutlanticCheckout`](https://github.com/Autlantic/payments-sdk/tree/main/sdks/ios) tag `sdks/ios/v0.1.0` | **None** |
| **Android (Kotlin)** | Source available | [`sdks/android`](https://github.com/Autlantic/payments-sdk/tree/main/sdks/android) (Maven Central pending namespace) | **None** |
| **Flutter** | Available (alpha/source) | [`autlantic_checkout`](https://github.com/Autlantic/payments-sdk/tree/main/sdks/flutter) **0.1.0** | **None** |
| **React Native** | Available (alpha/source) | [`@autlantic/checkout`](https://github.com/Autlantic/payments-sdk/tree/main/sdks/react-native) **0.1.0** | **None** |

## Who installs what

```text
Merchant backend  →  Node / Python / Go / PHP / Java / .NET SDK  →  billing-api (/v1 + webhooks)
Merchant mobile   →  iOS / Android / Flutter / RN Checkout  →  opens hosted checkoutUrl
```

- **Server SDKs** create subscriptions, payments, and payment links; verify webhooks; unlock access.
- **Mobile SDKs** only present the hosted checkout URL and handle return deep links. They never accept `abk_*` keys or webhook secrets.

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
| Any language | [Hosted HTTP API](/api/http) · [OpenAPI](/api/openapi) |

## Related

- [Mobile apps](/guide/mobile)
- [API versioning](/guide/api-versioning)
- [15-minute integration](/guide/integration)
- [Security](/guide/security)
