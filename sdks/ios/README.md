# Autlantic Checkout (iOS)

Official mobile SDK. Opens hosted Autlantic checkout URLs. **No API keys.**

## Install (SPM)

Add the local package path `sdks/ios` (or the GitHub repo subdirectory when published).

```swift
import AutlanticCheckout

AutlanticCheckout.present(
  url: checkoutURL,           // from your backend
  returnURLScheme: "myapp",   // Info.plist URL scheme
  from: self
) { result in
  // Refresh entitlement from YOUR backend after webhook
}
```

Use `successUrl` / `cancelUrl` on payment links (or your session create API) that match the return scheme, e.g. `myapp://billing/success`.

Docs: [Mobile apps](https://docs.autlantic.com/guide/mobile)
