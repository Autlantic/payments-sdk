# Flutter Checkout SDK

Official **mobile** Checkout presenter for Flutter. Opens hosted Autlantic checkout URLs. **No API keys** in the app.

Source: [`sdks/flutter`](https://github.com/Autlantic/payments-sdk/tree/main/sdks/flutter). Package: `autlantic_checkout` **0.1.0**.

- **iOS:** `ASWebAuthenticationSession`
- **Android:** Chrome Custom Tabs (`androidx.browser:browser:1.8.0`)

## Install

Until pub.dev:

```yaml
dependencies:
  autlantic_checkout:
    path: /path/to/payments-sdk/sdks/flutter
    # or git:
    # git:
    #   url: https://github.com/Autlantic/payments-sdk.git
    #   path: sdks/flutter
```

## API

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

| Piece | Role |
|-------|------|
| `AutlanticCheckout.present(checkoutUrl, { returnUrlScheme })` | Opens hosted checkout |
| `AutlanticCheckoutResult` | `completed` / `canceled` / `failed` |

## Backend contract

1. Your server creates a session with Node/Python/Go/PHP/Java/.NET (`successUrl` / `cancelUrl` like `myapp://billing/success`).
2. App calls `present` with the returned `checkoutUrl`.
3. After return, poll **your** access API. Unlock only after a verified webhook on the server.

Sample: [`examples/mobile-checkout`](https://github.com/Autlantic/payments-sdk/tree/main/examples/mobile-checkout) (`pnpm example:mobile`).

## Related

- [Mobile apps](/guide/mobile)
- [React Native Checkout](/api/react-native)
- [iOS Checkout](/api/ios) · [Android Checkout](/api/android)
- [Languages and SDKs](/guide/languages)
- [Security](/guide/security)
