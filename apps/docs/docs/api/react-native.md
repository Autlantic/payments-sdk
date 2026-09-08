# React Native Checkout SDK

Official **mobile** Checkout presenter for React Native. Opens hosted Autlantic checkout URLs. **No API keys** in the app.

Source: [`sdks/react-native`](https://github.com/Autlantic/payments-sdk/tree/main/sdks/react-native). Package: `@autlantic/checkout` **0.1.0**.

- **iOS:** `ASWebAuthenticationSession`
- **Android:** Chrome Custom Tabs (`androidx.browser:browser:1.8.0`)
- Classic `NativeModules` (New Architecture optional)

## Install

```bash
npm install @autlantic/checkout
# until npm: npm install /path/to/payments-sdk/sdks/react-native
cd ios && pod install
```

Requires a custom native build (not Expo Go).

## API

```ts
import AutlanticCheckout from '@autlantic/checkout';

const result = await AutlanticCheckout.present(checkoutUrl, {
  returnUrlScheme: 'myapp',
});
// { status: 'completed' | 'canceled' | 'failed', callbackUrl?: string, error?: string }
```

| Piece | Role |
|-------|------|
| `AutlanticCheckout.present(checkoutUrl, { returnUrlScheme })` | Opens hosted checkout |
| Result `status` | `completed` / `canceled` / `failed` |

On Android, Custom Tabs launch resolves as `completed` without `callbackUrl`; configure deep links in the host app, then poll **your** backend.

## Backend contract

Same as iOS/Android/Flutter: server creates session → app presents URL → webhook unlocks → app polls your API.

Sample: [`examples/mobile-checkout`](https://github.com/Autlantic/payments-sdk/tree/main/examples/mobile-checkout) (`pnpm example:mobile`).

## Related

- [Mobile apps](/guide/mobile)
- [Flutter Checkout](/api/flutter)
- [iOS Checkout](/api/ios) · [Android Checkout](/api/android)
- [Languages and SDKs](/guide/languages)
- [Security](/guide/security)
