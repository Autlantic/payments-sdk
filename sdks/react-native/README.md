# @autlantic/checkout

React Native module that presents hosted Autlantic checkout URLs. **No API keys** in the app.

- **iOS:** `ASWebAuthenticationSession`
- **Android:** Chrome Custom Tabs (`androidx.browser`)

Uses classic `NativeModules` (New Architecture optional). Avoid locked WebViews so WalletConnect can hand off to wallet apps.

## Install

```bash
npm install @autlantic/checkout
# or path until published:
# npm install /path/to/payments-sdk/sdks/react-native
cd ios && pod install
```

Autolinking picks up the Android package and the CocoaPods podspec.

## API

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

## Related

- [React Native docs](https://docs.autlantic.com/api/react-native)
- [Mobile apps](https://docs.autlantic.com/guide/mobile)
- [iOS Checkout](https://docs.autlantic.com/api/ios) · [Android Checkout](https://docs.autlantic.com/api/android)
