<p align="center">
  <img src="https://autlantic.com/brand/autlantic-icon-1024-master.png" alt="Autlantic" width="96" height="96" />
</p>

<h1 align="center">Autlantic Billing — iOS</h1>

<p align="center">
  <strong>USDC payments on Base</strong><br />
  Official mobile Checkout presenter. Opens hosted checkout URLs — no API keys in the app.
</p>

<p align="center">
  <a href="https://docs.autlantic.com/api/ios"><img src="https://img.shields.io/badge/docs-docs.autlantic.com-5672cd?style=flat-square" alt="Docs" /></a>
  <a href="https://github.com/Autlantic/payments-sdk/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="MIT License" /></a>
  <a href="https://autlantic.com"><img src="https://img.shields.io/badge/product-autlantic.com-111827?style=flat-square" alt="Autlantic" /></a>
</p>

---

## Why this SDK

Checkout presenter only. Your backend creates the session; this package opens the hosted `checkoutUrl` via `ASWebAuthenticationSession` and returns via your deep link. Never embed `abk_*` keys or webhook secrets in the app.

## Install

Swift Package Manager (not CocoaPods). Tag: `sdks/ios/v0.1.0`.

1. Xcode → **File → Add Package Dependencies…**
2. URL: `https://github.com/Autlantic/payments-sdk.git`
3. Dependency rule: tag `sdks/ios/v0.1.0` (or branch `main`)
4. Add product **AutlanticCheckout**

For local development, select the `sdks/ios` folder if Xcode asks for a package path.

## Quick start

```swift
import AutlanticCheckout

AutlanticCheckout.present(
  url: checkoutURL,           // from YOUR backend
  returnURLScheme: "myapp",   // Info.plist URL scheme
  from: self
) { result in
  switch result {
  case .completed(let callbackURL):
    // Refresh entitlement from YOUR backend after webhook
    break
  case .canceled:
    break
  case .failed(let error):
    break
  }
}
```

Use `successUrl` / `cancelUrl` on payment links (or session create) that match the return scheme, e.g. `myapp://billing/success`.

## Backend contract

1. Your server creates a session (Node / Python / Go / PHP / Java / .NET) with `successUrl` / `cancelUrl` like `myapp://billing/success`.
2. App calls `present` with the returned `checkoutUrl`.
3. After return, poll **your** access API. Unlock only after a verified webhook on the server.

Sample: [`examples/mobile-checkout`](../../examples/mobile-checkout) (`pnpm example:mobile`) · [`ios-sample`](../../examples/mobile-checkout/ios-sample).

## Documentation

| | |
|--|--|
| [iOS Checkout](https://docs.autlantic.com/api/ios) | API reference |
| [Mobile apps](https://docs.autlantic.com/guide/mobile) | Mobile integration guide |
| [Languages](https://docs.autlantic.com/guide/languages) | All SDK surfaces |
| [Security](https://docs.autlantic.com/guide/security) | Secrets & threat model |
| [Terms](https://autlantic.com/terms) · [Privacy](https://autlantic.com/privacy) | Legal |

## Develop

Open [`examples/mobile-checkout/ios-sample/CheckoutSample.xcodeproj`](../../examples/mobile-checkout/ios-sample) after adding the local `sdks/ios` package.

## License

MIT · Operated by **Autlantic Limited** (UK company no. 17422039).

Part of [Autlantic Payments SDK](https://github.com/Autlantic/payments-sdk).
