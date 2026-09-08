# Android Checkout SDK

Official **mobile** Checkout presenter. Opens hosted Autlantic checkout URLs via Chrome Custom Tabs. **No API keys** in the app.

Source: [`sdks/android`](https://github.com/Autlantic/payments-sdk/tree/main/sdks/android).

**Maven Central:** publish pipeline is ready (`com.autlantic:checkout`). First release lands after the `com.autlantic` namespace is verified and GitHub Actions secrets are set (see [`sdks/PUBLISHING.md`](https://github.com/Autlantic/payments-sdk/blob/main/sdks/PUBLISHING.md)).

## Install

**After Maven Central release:**

```kotlin
implementation("com.autlantic:checkout:0.1.0")
```

**Until then (local module):**

```kotlin
include(":autlantic-checkout")
project(":autlantic-checkout").projectDir =
  file("/path/to/payments-sdk/sdks/android/autlantic-checkout")

implementation(project(":autlantic-checkout"))
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

Sample: [`examples/mobile-checkout`](https://github.com/Autlantic/payments-sdk/tree/main/examples/mobile-checkout) and `android-sample/MainActivity.kt`. Emulator host loopback: `http://10.0.2.2:3055`.

## Related

- [Mobile apps](/guide/mobile)
- [iOS Checkout](/api/ios)
- [Languages and SDKs](/guide/languages)
- [Security](/guide/security)
