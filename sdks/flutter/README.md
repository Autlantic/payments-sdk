<p align="center">
  <img src="https://autlantic.com/brand/autlantic-icon-1024-master.png" alt="Autlantic" width="96" height="96" />
</p>

<h1 align="center">Autlantic Billing — Flutter</h1>

<p align="center">
  <strong>USDC payments on Base</strong><br />
  Official mobile Checkout presenter. Opens hosted checkout URLs — no API keys in the app.
</p>

<p align="center">
  <a href="https://pub.dev/packages/autlantic_checkout"><img src="https://img.shields.io/pub/v/autlantic_checkout?style=flat-square&color=5672cd" alt="pub.dev" /></a>
  <a href="https://docs.autlantic.com/api/flutter"><img src="https://img.shields.io/badge/docs-docs.autlantic.com-5672cd?style=flat-square" alt="Docs" /></a>
  <a href="https://github.com/Autlantic/payments-sdk/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="MIT License" /></a>
  <a href="https://autlantic.com"><img src="https://img.shields.io/badge/product-autlantic.com-111827?style=flat-square" alt="Autlantic" /></a>
</p>

---

## Why this SDK

Checkout presenter only (`autlantic_checkout`). Your backend creates the session; this plugin opens the hosted `checkoutUrl`. **iOS:** `ASWebAuthenticationSession` · **Android:** Chrome Custom Tabs. Never embed `abk_*` keys or webhook secrets in the app. Do not lock checkout in a WebView — WalletConnect needs to hand off to wallet apps.

## Install

```yaml
dependencies:
  autlantic_checkout: ^0.1.0
```

```bash
flutter pub get
```

Package: [`autlantic_checkout`](https://pub.dev/packages/autlantic_checkout) **0.1.0**.

## Quick start

```dart
import 'package:autlantic_checkout/autlantic_checkout.dart';

final result = await AutlanticCheckout.present(
  checkoutUrl, // from YOUR backend
  returnUrlScheme: 'myapp',
);

switch (result.status) {
  case AutlanticCheckoutStatus.completed:
    // iOS: optional result.callbackUrl
    // Android: Custom Tabs opened; handle deep links, then poll YOUR backend
    break;
  case AutlanticCheckoutStatus.canceled:
    break;
  case AutlanticCheckoutStatus.failed:
    // result.message
    break;
}
```

## Backend contract

1. Your server creates a session (Node / Python / Go / PHP / Java / .NET) with `successUrl` / `cancelUrl` like `myapp://billing/success`.
2. App calls `present` with the returned `checkoutUrl`.
3. After return, poll **your** access API. Unlock only after a verified webhook on the server.

Sample merchant backend: [`examples/mobile-checkout`](../../examples/mobile-checkout) (`pnpm example:mobile`).

## Documentation

| | |
|--|--|
| [Flutter Checkout](https://docs.autlantic.com/api/flutter) | API reference |
| [Mobile apps](https://docs.autlantic.com/guide/mobile) | Mobile integration guide |
| [iOS](https://docs.autlantic.com/api/ios) · [Android](https://docs.autlantic.com/api/android) | Native Checkout |
| [Languages](https://docs.autlantic.com/guide/languages) | All SDK surfaces |
| [Security](https://docs.autlantic.com/guide/security) | Secrets & threat model |

## Develop

```bash
cd sdks/flutter
flutter analyze
```

Maintainer publish: `flutter pub publish` (see [`../PUBLISHING.md`](../PUBLISHING.md)).

## License

MIT · Operated by **Autlantic Limited** (UK company no. 17422039).

Part of [Autlantic Payments SDK](https://github.com/Autlantic/payments-sdk).
