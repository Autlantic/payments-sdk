<p align="center">
  <img src="https://autlantic.com/brand/autlantic-icon-1024-master.png" alt="Autlantic" width="96" height="96" />
</p>

<h1 align="center">Autlantic Billing — Android</h1>

<p align="center">
  <strong>USDC payments on Base</strong><br />
  Official mobile Checkout presenter. Opens hosted checkout URLs via Chrome Custom Tabs — no API keys in the app.
</p>

<p align="center">
  <a href="https://docs.autlantic.com/api/android"><img src="https://img.shields.io/badge/docs-docs.autlantic.com-5672cd?style=flat-square" alt="Docs" /></a>
  <a href="https://github.com/Autlantic/payments-sdk/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="MIT License" /></a>
  <a href="https://autlantic.com"><img src="https://img.shields.io/badge/product-autlantic.com-111827?style=flat-square" alt="Autlantic" /></a>
</p>

---

## Why this SDK

Checkout presenter only. Your backend creates the session; this package opens the hosted `checkoutUrl` via Chrome Custom Tabs. Never embed `abk_*` keys or webhook secrets in the app.

## Install

**After Maven Central** (`com.autlantic:checkout:0.1.0`):

```kotlin
implementation("com.autlantic:checkout:0.1.0")
```

**Until then (local module):**

```kotlin
// settings.gradle.kts
include(":autlantic-checkout")
project(":autlantic-checkout").projectDir =
  file("/path/to/payments-sdk/sdks/android/autlantic-checkout")

// build.gradle.kts
implementation(project(":autlantic-checkout"))
```

## Quick start

```kotlin
import com.autlantic.checkout.AutlanticCheckout

// checkoutUrl from YOUR backend
AutlanticCheckout.present(context, checkoutUrl)
```

Handle `successUrl` / `cancelUrl` with an app deep link / App Link intent filter, then poll **your** backend for access.

## Backend contract

1. Your server creates a session with `successUrl` / `cancelUrl` like `myapp://billing/success`.
2. App calls `present` with the returned `checkoutUrl`.
3. After return, poll **your** access API. Unlock only after a verified webhook on the server.

Sample: [`examples/mobile-checkout/android-sample`](../../examples/mobile-checkout/android-sample) (`./gradlew :app:assembleDebug`). Emulator host loopback: `http://10.0.2.2:3055`.

## Documentation

| | |
|--|--|
| [Android Checkout](https://docs.autlantic.com/api/android) | API reference |
| [Mobile apps](https://docs.autlantic.com/guide/mobile) | Mobile integration guide |
| [Languages](https://docs.autlantic.com/guide/languages) | All SDK surfaces |
| [Security](https://docs.autlantic.com/guide/security) | Secrets & threat model |
| [Terms](https://autlantic.com/terms) · [Privacy](https://autlantic.com/privacy) | Legal |

## Develop

```bash
cd examples/mobile-checkout/android-sample
./gradlew :app:assembleDebug
```

Maintainer publish: see [`../PUBLISHING.md`](../PUBLISHING.md).

## License

MIT · Operated by **Autlantic Limited** (UK company no. 17422039).

Part of [Autlantic Payments SDK](https://github.com/Autlantic/payments-sdk).
