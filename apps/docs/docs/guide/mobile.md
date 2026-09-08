# Mobile apps

Integrate Autlantic Billing into an iOS or Android app the same way Stripe Checkout works: **your backend** creates a session with a secret API key; **the app** opens the returned hosted checkout URL; **webhooks** unlock access.

Do not put `abk_test_*` / `abk_live_*` or webhook secrets in the mobile binary.

## Flow

1. App asks **your** backend for a checkout session (subscription, one-time payment, or payment link).
2. Backend calls Billing `POST /v1/*` ([Node](/api/nodejs) / [Python](/api/python) / [Go](/api/go) / [PHP](/api/php) / [Java](/api/java) / HTTP) and returns `checkoutUrl` (or payment link `url`) plus deep-link return URLs.
3. App opens that URL with the Autlantic Checkout SDK.
4. Customer completes wallet UX on **hosted checkout** (WalletConnect on mobile).
5. Checkout returns to your `successUrl` or `cancelUrl` (app deep link).
6. Billing delivers a signed webhook to your backend. Verify the signature, then grant entitlement.
7. App polls **your** API for access status. Do not call Billing `/v1` from the device with a secret key.

```text
App → Merchant backend → Billing API (/v1)
App → present(checkoutUrl) → Hosted checkout
Billing → signed webhook → Merchant backend → unlock
App → Merchant backend (status)
```

## Return URLs (deep links)

Subscriptions, one-time payments, and payment links accept `successUrl` and `cancelUrl` on create. Use your app’s URL scheme or universal / app links, for example:

- `myapp://billing/success`
- `https://app.example.com/billing/success`

Hosted checkout uses these for “Return to merchant” / cancel. After return, refresh status from **your** backend. Unlock only after a verified webhook (`invoice.paid`, `subscription.activated`, `payment.paid`, etc.).

## Official Checkout SDKs

| Platform | Install | API reference |
|----------|---------|----------------|
| **iOS** | Swift Package Manager (`sdks/ios`, tag `sdks/ios/v0.1.0`) | [iOS Checkout](/api/ios) |
| **Android** | Module from Git until Maven Central | [Android Checkout](/api/android) |

```swift
// iOS
AutlanticCheckout.present(url: checkoutURL, returnURLScheme: "myapp", from: self) { result in /* … */ }
```

```kotlin
// Android
AutlanticCheckout.present(context, checkoutUrl)
```

Prefer system browser surfaces (SPM uses `ASWebAuthenticationSession`; Android uses Custom Tabs) so WalletConnect can hand off to wallet apps. Avoid locked WebViews.

## Sample merchant backend

```bash
pnpm example:mobile
# POST http://localhost:3055/api/checkout
```

Repo: [`examples/mobile-checkout`](https://github.com/Autlantic/payments-sdk/tree/main/examples/mobile-checkout).

Openable apps (point at the sample backend):

- iOS: [`ios-sample/CheckoutSample.xcodeproj`](https://github.com/Autlantic/payments-sdk/tree/main/examples/mobile-checkout/ios-sample)
- Android: [`android-sample`](https://github.com/Autlantic/payments-sdk/tree/main/examples/mobile-checkout/android-sample) (`./gradlew :app:assembleDebug`)

Alternate hosted backends: [Python](https://github.com/Autlantic/payments-sdk/tree/main/examples/mobile-checkout/python) (3056), [Go](https://github.com/Autlantic/payments-sdk/tree/main/examples/mobile-checkout/go) (3057), [PHP](https://github.com/Autlantic/payments-sdk/tree/main/examples/mobile-checkout/php) (3058), [Java](https://github.com/Autlantic/payments-sdk/tree/main/examples/mobile-checkout/java) (3059).

## What the mobile app must never do

- Ship or embed Autlantic API keys or webhook secrets
- Call authenticated `/v1/*` with a secret from the device
- Verify webhooks on device
- Rebuild vault approve / mandate flows for v1 (use hosted checkout)

## Related

- [iOS Checkout](/api/ios)
- [Android Checkout](/api/android)
- [Languages and SDKs](/guide/languages)
- [Payment links](/guide/payment-links)
- [Webhooks](/guide/webhooks)
- [Security](/guide/security)
