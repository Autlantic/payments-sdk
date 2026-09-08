# Mobile checkout example

Sample **merchant backend** for Autlantic iOS/Android Checkout SDKs.

```bash
pnpm install
pnpm --filter @autlantic/example-mobile-checkout start
# → http://localhost:3055
```

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/checkout` | Create payment link / payment / subscription; returns `checkoutUrl` |
| `GET` | `/api/access/:merchantRef` | Poll entitlement after webhook |
| `POST` | `/webhooks/autlantic` | Verify `x-autlantic-signature` and grant access |

## App integration

```text
1. POST /api/checkout  →  { checkoutUrl, successUrl, cancelUrl, merchantRef }
2. AutlanticCheckout.present(checkoutUrl)   // iOS / Android SDK
3. Deep link successUrl / cancelUrl
4. GET /api/access/:merchantRef until active === true
```

Default return scheme: `myapp://billing/success` (override with `MOBILE_RETURN_SCHEME` or `MOBILE_SUCCESS_URL`).

## Modes

- **Sandbox (default):** no API key. Uses in-process Node sandbox (`sandbox://…` URLs). Good for webhook + access plumbing tests.
- **Hosted Test:** set `AUTLANTIC_BILLING_API_KEY=abk_test_…` (+ URL, merchant id, webhook secret, payout). Returns real `/checkout/…` URLs for device testing.

## App samples

| Path | Notes |
|------|--------|
| [`ios-sample/`](./ios-sample) | Open `CheckoutSample.xcodeproj` (local SPM `sdks/ios`) |
| [`android-sample/`](./android-sample) | Open in Android Studio or `./gradlew :app:assembleDebug` (local `sdks/android`) |

## Alternate backends (hosted)

| Path | Port | SDK |
|------|------|-----|
| Node (this folder) | 3055 | `@autlantic/payments-recurring` (sandbox or hosted) |
| [`python/`](./python) | 3056 | `autlantic-billing` |
| [`go/`](./go) | 3057 | Go module |
| [`php/`](./php) | 3058 | `autlantic/billing` |
| [`java/`](./java) | 3059 | `com.autlantic:billing` |

## Tests

```bash
pnpm --filter @autlantic/example-mobile-checkout test
```

See [Mobile apps](https://docs.autlantic.com/guide/mobile).
