<p align="center">
  <img src="https://autlantic.com/brand/autlantic-icon-1024-master.png" alt="Autlantic" width="96" height="96" />
</p>

<h1 align="center">Autlantic Billing — React Native</h1>

<p align="center">
  <strong>USDC payments on Base</strong><br />
  Official mobile Checkout presenter. Opens hosted checkout URLs — no API keys in the app.
</p>

<p align="center">
  <a href="https://docs.autlantic.com/api/react-native"><img src="https://img.shields.io/badge/docs-docs.autlantic.com-5672cd?style=flat-square" alt="Docs" /></a>
  <a href="https://github.com/Autlantic/payments-sdk/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="MIT License" /></a>
  <a href="https://autlantic.com"><img src="https://img.shields.io/badge/product-autlantic.com-111827?style=flat-square" alt="Autlantic" /></a>
</p>

---

## Why this SDK

Checkout presenter only (`@autlantic/checkout`). Your backend creates the session; this module opens the hosted `checkoutUrl`. **iOS:** `ASWebAuthenticationSession` · **Android:** Chrome Custom Tabs. Classic `NativeModules` (New Architecture optional). Never embed `abk_*` keys or webhook secrets in the app. Avoid locked WebViews so WalletConnect can hand off to wallet apps.

## Install

Until npm:

```bash
npm install github:Autlantic/payments-sdk#sdks/react-native/v0.1.0
# or: npm install /path/to/payments-sdk/sdks/react-native
cd ios && pod install
```

When published: `npm install @autlantic/checkout`. Autolinking picks up Android + the CocoaPods podspec. Requires a custom native build (not Expo Go).

## Quick start

```ts
import AutlanticCheckout from '@autlantic/checkout';

const result = await AutlanticCheckout.present(checkoutUrl, {
  returnUrlScheme: 'myapp',
});
// { status: 'completed' | 'canceled' | 'failed', callbackUrl?: string, error?: string }

if (result.status === 'completed') {
  // iOS may include callbackUrl. Android: Custom Tabs opened; handle deep links, then poll YOUR backend.
}
```

## Backend contract

1. Your server creates a session with `successUrl` / `cancelUrl` like `myapp://billing/success`.
2. App calls `present` with the returned `checkoutUrl`.
3. After return, poll **your** access API. Unlock only after a verified webhook on the server.

Sample merchant backend: [`examples/mobile-checkout`](../../examples/mobile-checkout) (`pnpm example:mobile`).

## Documentation

| | |
|--|--|
| [React Native Checkout](https://docs.autlantic.com/api/react-native) | API reference |
| [Mobile apps](https://docs.autlantic.com/guide/mobile) | Mobile integration guide |
| [iOS](https://docs.autlantic.com/api/ios) · [Android](https://docs.autlantic.com/api/android) | Native Checkout |
| [Languages](https://docs.autlantic.com/guide/languages) | All SDK surfaces |
| [Security](https://docs.autlantic.com/guide/security) | Secrets & threat model |

## Develop

```bash
cd sdks/react-native
npm run typescript
```

Maintainer publish: see [`../PUBLISHING.md`](../PUBLISHING.md).

## License

MIT · Operated by **Autlantic Limited** (UK company no. 17422039).

Part of [Autlantic Payments SDK](https://github.com/Autlantic/payments-sdk).
