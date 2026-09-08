# Android SDK

Official Autlantic Billing **mobile Checkout presenter** for Android.
Part of the [Autlantic Payments SDK](https://github.com/Autlantic/payments-sdk) · [Languages](/guide/languages).

**USDC on Base** · never put API keys or webhook secrets in the app.

Source: [`sdks/android`](https://github.com/Autlantic/payments-sdk/tree/main/sdks/android). Package: [`com.autlantic:checkout`](https://central.sonatype.com/artifact/com.autlantic/checkout) **0.1.0** on Maven Central.

## Install

```kotlin
implementation("com.autlantic:checkout:0.1.0")
```

## API

```kotlin
import com.autlantic.checkout.AutlanticCheckout

// checkoutUrl from YOUR backend (never call Billing /v1 with a secret from the app)
AutlanticCheckout.present(context, checkoutUrl)
```

| Piece | Role |
|-------|------|
| `AutlanticCheckout.present(context, checkoutUrl)` | Opens Custom Tabs |

Handle `successUrl` / `cancelUrl` with an app deep link / App Link intent filter, then poll **your** backend for access.

## Backend contract

Same as iOS: server creates session → app presents URL → webhook unlocks → app polls your API.

Sample: openable app [`examples/mobile-checkout/android-sample`](https://github.com/Autlantic/payments-sdk/tree/main/examples/mobile-checkout/android-sample) (`./gradlew :app:assembleDebug`). Emulator host loopback: `http://10.0.2.2:3055`.

## Related

- [Languages and SDKs](/guide/languages)
- [Mobile apps](/guide/mobile)
- [Security](/guide/security)
- [iOS Checkout](/api/ios)
