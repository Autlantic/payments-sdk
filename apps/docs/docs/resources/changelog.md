# Changelog

## Unreleased

- Enterprise readiness (Phases 1–6, brief): hosted API key rotation, audit log, and durable webhook retries; API versioning, rate limits, and idempotency docs; merchant test clock; reconciliation CSV exports and customer self-serve portal on hosting; [Trust center](/guide/trust), [Status](/resources/status), and DPA outline template (`/legal/dpa-template.md`, pending counsel, not legal advice). No SOC 2 claim.
- .NET: [`Autlantic.Billing`](https://www.nuget.org/packages/Autlantic.Billing) **0.1.0** on NuGet · [.NET docs](/api/dotnet)
- Flutter: [`autlantic_checkout`](https://pub.dev/packages/autlantic_checkout) **0.1.0** on pub.dev · [Flutter docs](/api/flutter)
- React Native: [`@autlantic/checkout`](https://www.npmjs.com/package/@autlantic/checkout) **0.1.0** on npm · [React Native docs](/api/react-native)
- SDK READMEs and API docs aligned to shared Autlantic branding standard (`sdks/README.STANDARD.md`)
- Guide: [Device smoke test](/guide/device-smoke) (Test-key phone / simulator walkthrough)
- Flutter / RN / .NET: registry publish steps in `sdks/PUBLISHING.md`
- PHP: mirror [`Autlantic/billing-php`](https://github.com/Autlantic/billing-php) `v0.1.0` for Packagist/VCS install · [PHP docs](/api/php)
- Java: `com.autlantic:billing` **0.1.0** under `sdks/java` · [Java docs](/api/java)
- Example: `examples/mobile-checkout/java` (port 3059), `examples/mobile-checkout/dotnet` (port 3060)

## 0.3.12 - Multi-language and mobile SDKs

- `@autlantic/payments-recurring` **0.3.12** on npm: `AUTLANTIC_API_VERSION` (`2026-01-01`), `Autlantic-Version` header, `successUrl` / `cancelUrl` on create subscription, payment, and payment link
- Hosted API live pin: `Autlantic-Version: 2026-01-01` on `billing.autlantic.com`
- Python: [`autlantic-billing`](https://pypi.org/project/autlantic-billing/) **0.1.0** on PyPI
- Go: module tag `sdks/go/v0.1.0`
- PHP: `autlantic/billing` **0.1.0** (`sdks/php` / `sdks/php/v0.1.0`)
- iOS Checkout (SPM): tag `sdks/ios/v0.1.0` · [iOS docs](/api/ios)
- Android Checkout: source in `sdks/android` · [Android docs](/api/android) (Maven Central pending)
- Docs: [Languages](/guide/languages), [Mobile](/guide/mobile), [API versioning](/guide/api-versioning), [Python](/api/python), [Go](/api/go)
- Example: `examples/mobile-checkout` (`pnpm example:mobile`) with openable iOS/Android apps and Python/Go hosted backends
- Autlantic platform dogfood pin: `@autlantic/payments-recurring` **0.3.12**

## 0.3.11 - Fix npm dependency pins

- Republish with resolved semver deps (0.3.10 tarball incorrectly contained `workspace:*`)

## 0.3.10 - Legal readme update

- npm README: Autlantic Limited operator line, About, Terms, Privacy, and Billing Terms links
- Root README and LICENSE: copyright holder **Autlantic Limited** (UK co. 17422039)

## 0.3.7 - Portal webhooks only

- Removed deprecated `billingWebhookUrl()` / `AUTLANTIC_BILLING_WEBHOOK_URL` delivery helper from `@autlantic/billing-engine`
- Docs and npm README: merchants register webhook URL + secret in the **portal**; billing delivers only via those endpoints
- `@autlantic/billing-engine` **0.3.5**, `@autlantic/payments-recurring` **0.3.7**

## 0.3.6 - Mode from API key

- `fromEnv()` sandbox follows API key mode (`abk_test_*` / `abk_live_*`); live break-glass via `AUTLANTIC_BILLING_ALLOW_LIVE_SANDBOX`
- Helpers: `billingModeFromApiKey`, `sandboxFromApiKeyAndEnv`
- `@autlantic/payments-recurring` **0.3.6**

## 0.3.5 - Resume + first-period charge fix

- `resumeSubscription(id)` undoes cancel-at-period-end (hosted `POST /v1/subscriptions/:id/resume`)
- First invoice payment no longer advances `currentPeriodStart` / `currentPeriodEnd` (renewals still advance)
- `@autlantic/billing-engine` **0.3.4**, `@autlantic/payments-recurring` **0.3.5**

## 0.3.4 - Unwrap getSubscription / getInvoice

- `getSubscription` and `getInvoice` now return the resource object (same as `getPayment`), not the `{ subscription }` / `{ invoice }` API wrapper
- Fixes remote-mode ownership checks that read `metadata` / `status` on an undefined nested object

## 0.3.3 - Docs and npm positioning

- npm / README: non-custodial settlement, relayer gas-only wording, product security links
- Docs: Test / Live wording without Stripe-as-model framing; example store custody notes
- Package versions: `@autlantic/payments-recurring` / `@autlantic/billing-engine` **0.3.3**, `@autlantic/chain-evm` **0.2.8**

## 0.3.2 - Enterprise SDK diagnostics

- Pluggable **`BillingLogger`** + opt-in **`debug`** / `AUTLANTIC_BILLING_DEBUG`
- Redacted HTTP request/response traces (`X-Autlantic-Client-Request-Id`, sdk version header)
- Typed **`AutlanticBillingError`** (`code`, `type`, `statusCode`, `requestId`)
- Webhook **`verifyBillingWebhookDetailed`**, **`parseBillingWebhookEventDetailed`**, **`assertBillingWebhook`**
- Write-through store persist failures no longer hardcode `console.error` (optional `onPersistError`)
- `logRelayerIntent` is silent unless a log fn is passed
- Docs: [Debugging](/guide/debugging); fixed webhook verify argument order
- Docs DX: [15-minute integration](/guide/integration), [Local webhooks](/guide/local-webhooks), [FAQ](/guide/faq), [OpenAPI](/api/openapi), [Postman](/resources/postman)

Package versions: `@autlantic/payments-recurring` / `@autlantic/billing-engine` **0.3.2**, `@autlantic/chain-evm` **0.2.7**.

## 0.3.1 - Align engine with hosted portal / billing

Upstream features required by Autlantic hosted billing (portal, API, worker) so npm matches production behavior:

- Test/Live `mode` on customers, subscriptions, invoices, and one-time payments
- `resumeSubscription` for cancel-at-period-end undo
- `chainIdForBillingMode("test" | "live")` (Sepolia vs Base)
- `processDueInvoices` / `processDueInvoicesLive` optional `mode` filter
- Checkout session extras: coupons, `listAmountUsdc`, `nextPaymentAt`, merchant branding
- `BillingPersistAdapter.loadPaymentLink?` for cross-process link loads
- Payment links stamp `mode` on minted one-time payments

Package versions: `@autlantic/payments-recurring` / `@autlantic/billing-engine` **0.3.1**, `@autlantic/payments-recurring-core` / `@autlantic/chain-evm` **0.2.6**.

## 0.3.0 - Payment links (URL / QR)

- Shareable **payment links**: fixed USDC amount, optional max uses / expiry
- SDK: `createPaymentLink`, `listPaymentLinks`, `getPaymentLink`, `disablePaymentLink`, `openPaymentLink`
- Hosted: `POST /v1/payment-links`, public `/checkout/link/:id` (opens into one-time pay checkout)
- Merchant portal: **Payment links** page with copy URL and QR
- Webhooks: `payment.created` / `payment.paid` when a link is opened and paid
- E2E smoke: `pnpm test:e2e:payment-links`

## Docs - Test / Live API keys

- Document Test and Live: portal toggle, `abk_test_` / `abk_live_` keys, Sepolia vs Base mainnet
- Webhook docs use per-mode endpoint signing secrets
- Clarify `AUTLANTIC_BILLING_SANDBOX` is not the primary hosted mode switch

## 0.2.6 - Catalog products + example store

- `listProducts()` and `priceId` on `createSubscription`
- Hosted `GET /v1/products`
- Example storefront in the public [payments-sdk](https://github.com/autlantic/payments-sdk/tree/main/examples/subscription-store) repo

## 0.2.1 - Public docs alignment

- Marketing and getting-started samples match the real `AutlanticBilling` API
- Clarify that `activateSubscription` charges the first invoice
- Docs site no longer links to the private GitHub repo

## 0.2.0 - Recurring USDC on Base

- `@autlantic/payments-recurring` merchant SDK
- `@autlantic/payments-recurring-core` types and retry policy
- `@autlantic/chain-evm` Base + USDC adapter
- `@autlantic/billing-engine` subscriptions, invoices, webhooks
- Hosted `billing-api` and `billing-worker`

## 0.1.x - Legacy (removed)

Tron USDT one-off checkout (`@autlantic/payments`, `@autlantic/chain-tron`) has been removed from this monorepo.
