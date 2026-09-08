# Languages and SDKs

Autlantic Billing is **one hosted API**. Official SDKs are thin clients around that API (Stripe-style). They are not separate billing backends.

## Matrix

| Surface | Status | Package / artifact | Secrets |
|---------|--------|--------------------|---------|
| **Hosted HTTP API** | Available | [OpenAPI](/api/openapi) · `https://billing.autlantic.com` | Server API key |
| **Node.js / TypeScript** | Available (reference) | [`@autlantic/payments-recurring`](https://www.npmjs.com/package/@autlantic/payments-recurring) | Server only |
| **Python** | Alpha (in repo) | `sdks/python` → `autlantic-billing` (PyPI when published) | Server only |
| **Go** | Alpha (in repo) | `sdks/go` (`github.com/Autlantic/payments-sdk/sdks/go`) | Server only |
| **iOS (Swift)** | Alpha (in repo) | `sdks/ios` (`AutlanticCheckout` SPM) | **None** (opens `checkoutUrl`) |
| **Android (Kotlin)** | Alpha (in repo) | `sdks/android` (`com.autlantic.checkout`) | **None** (opens `checkoutUrl`) |
| **PHP / Java / .NET** | Later | Official server clients | Server only |
| **Flutter / React Native** | Later | Wrappers over native Checkout | **None** |

## Who installs what

```text
Merchant backend  →  Node / Python / Go SDK  →  billing-api (/v1 + webhooks)
Merchant mobile   →  iOS / Android Checkout SDK  →  opens hosted checkoutUrl
```

- **Server SDKs** create subscriptions, payments, and payment links; verify webhooks; unlock access.
- **Mobile SDKs** only present the hosted checkout URL and handle return deep links. They never accept `abk_*` keys or webhook secrets.

## Non-Node backends today

Until Python/Go packages publish, use the [Hosted HTTP API](/api/http) with your language’s HTTP client and the [OpenAPI](/api/openapi) spec. Webhook verification must match the [Webhooks](/guide/webhooks) signature rules.

## Related

- [Mobile apps](/guide/mobile)
- [API versioning](/guide/api-versioning)
- [15-minute integration](/guide/integration)
- [Security](/guide/security)
