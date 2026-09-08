# autlantic_checkout

Flutter plugin that presents hosted Autlantic checkout URLs. **No API keys** in the app.

- **iOS:** `ASWebAuthenticationSession` (system browser sheet)
- **Android:** Chrome Custom Tabs (`androidx.browser`)

Do not embed locked WebViews — WalletConnect needs to hand off to wallet apps.

## Install

Path dependency (until pub.dev):

```yaml
dependencies:
  autlantic_checkout:
    path: /path/to/payments-sdk/sdks/flutter
```

## API

```dart
import 'package:autlantic_checkout/autlantic_checkout.dart';

final result = await AutlanticCheckout.present(
  checkoutUrl, // from YOUR backend — never call Billing /v1 with a secret from the app
  returnUrlScheme: 'myapp',
);

switch (result.status) {
  case AutlanticCheckoutStatus.completed:
    // iOS: optional result.callbackUrl
    // Android: Custom Tabs opened; handle deep links in the host app, then poll YOUR backend
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

## Related

- [Flutter docs](https://docs.autlantic.com/api/flutter)
- [Mobile apps](https://docs.autlantic.com/guide/mobile)
- [iOS Checkout](https://docs.autlantic.com/api/ios) · [Android Checkout](https://docs.autlantic.com/api/android)
