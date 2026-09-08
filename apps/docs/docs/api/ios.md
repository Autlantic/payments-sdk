# iOS Checkout SDK

Official **mobile** Checkout presenter. Opens hosted Autlantic checkout URLs. **No API keys** in the app.

Uses **Swift Package Manager** (not CocoaPods). Tag: `sdks/ios/v0.1.0`.

## Install (SPM)

1. Xcode → **File → Add Package Dependencies…**
2. URL: `https://github.com/Autlantic/payments-sdk.git`
3. Dependency rule: tag `sdks/ios/v0.1.0` (or branch `main`)
4. Add product **AutlanticCheckout**

The package lives at `sdks/ios` in the repo. If Xcode asks for a package path during local development, select that folder.

## API

```swift
import AutlanticCheckout

AutlanticCheckout.present(
  url: checkoutURL,           // from YOUR backend
  returnURLScheme: "myapp",   // Info.plist URL scheme
  from: self
) { result in
  switch result {
  case .completed(let callbackURL):
    // Refresh entitlement from YOUR backend
    break
  case .canceled:
    break
  case .failed(let error):
    break
  }
}
```

| Piece | Role |
|-------|------|
| `present(url:returnURLScheme:from:completion:)` | Opens hosted checkout via `ASWebAuthenticationSession` |
| `AutlanticCheckoutResult` | `.completed` / `.canceled` / `.failed` |

## Backend contract

1. Your server creates a session with Node/Python/Go (`successUrl` / `cancelUrl` like `myapp://billing/success`).
2. App calls `present` with the returned `checkoutUrl`.
3. After return, poll **your** access API. Unlock only after a verified webhook on the server.

Sample: [`examples/mobile-checkout`](https://github.com/Autlantic/payments-sdk/tree/main/examples/mobile-checkout) (`pnpm example:mobile`) and openable app [`ios-sample/CheckoutSample.xcodeproj`](https://github.com/Autlantic/payments-sdk/tree/main/examples/mobile-checkout/ios-sample).

## Related

- [Mobile apps](/guide/mobile)
- [Android Checkout](/api/android)
- [Languages and SDKs](/guide/languages)
- [Security](/guide/security)
