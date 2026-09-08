# Official SDKs (non-TypeScript)

Stripe-style clients for the **same** hosted Billing API (`https://billing.autlantic.com`).  
The reference implementation remains `@autlantic/payments-recurring` under `packages/`.

| Directory | Role | Secrets |
|-----------|------|---------|
| `python/` | Merchant **server** client (PyPI) | API key + webhook secret |
| `go/` | Merchant **server** client (Go module) | API key + webhook secret |
| `php/` | Merchant **server** client (Composer) | API key + webhook secret |
| `java/` | Merchant **server** client (Maven/Gradle) | API key + webhook secret |
| `dotnet/` | Merchant **server** client (NuGet) | API key + webhook secret |
| `ios/` | Mobile **Checkout** presenter (SPM) | None |
| `android/` | Mobile **Checkout** presenter (Maven) | None |

## Rules

1. Server SDKs call `/v1/*` only. Send `Autlantic-Version`, `Idempotency-Key` on POSTs, and a clear `User-Agent`.
2. Mobile SDKs only present hosted `checkoutUrl` / payment-link `url` and handle return deep links.
3. Do not port in-process `AutlanticBilling.sandbox()` / `billing-engine` into these languages. Test mode uses `abk_test_*` against the hosted API.
4. Hand-write webhook verification to match `packages/payments-recurring/src/webhook.ts`.
5. Publish packages before Autlantic platform (or any merchant) depends on them.

See docs: [Languages](../apps/docs/docs/guide/languages.md), [Mobile](../apps/docs/docs/guide/mobile.md), [API versioning](../apps/docs/docs/guide/api-versioning.md).
