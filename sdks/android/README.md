# Autlantic Checkout (Android)

Official mobile SDK. Opens hosted Autlantic checkout URLs via Chrome Custom Tabs. **No API keys.**

```kotlin
import com.autlantic.checkout.AutlanticCheckout

// checkoutUrl comes from your backend (never call Billing /v1 with a secret from the app)
AutlanticCheckout.present(context, checkoutUrl)
```

Handle `successUrl` / `cancelUrl` deep links in your app, then poll **your** API for access after the webhook.

Module: `sdks/android/autlantic-checkout`. Publish to Maven when ready.

Docs: [Mobile apps](https://docs.autlantic.com/guide/mobile)
