# Android Checkout SDK

Official **mobile** Checkout presenter. Opens hosted Autlantic checkout URLs via Chrome Custom Tabs. **No API keys** in the app.

Source: [`sdks/android`](https://github.com/Autlantic/payments-sdk/tree/main/sdks/android). **Maven Central** publish is pending (`com.autlantic` namespace verification). Until then, include the module from Git / as a composite build.

## Install (until Maven Central)

**Option A. Local module**

1. Clone [payments-sdk](https://github.com/Autlantic/payments-sdk)
2. In `settings.gradle.kts`:

```kotlin
include(":autlantic-checkout")
project(":autlantic-checkout").projectDir =
  file("/path/to/payments-sdk/sdks/android/autlantic-checkout")
```

3. Dependency:

```kotlin
implementation(project(":autlantic-checkout"))
```

**Option B.** Copy the `autlantic-checkout` module into your app repo.

After Maven Central ships, coordinates will be `com.autlantic:checkout:<version>`.

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
