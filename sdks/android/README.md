# Autlantic Checkout (Android)

Official mobile SDK. Opens hosted Autlantic checkout URLs via Chrome Custom Tabs. **No API keys.**

Coordinates (after Maven Central publish): `com.autlantic:checkout:0.1.0`

```kotlin
implementation("com.autlantic:checkout:0.1.0")
```

Until Central is live, include the local module from this repo (`sdks/android/autlantic-checkout`).

```kotlin
import com.autlantic.checkout.AutlanticCheckout

AutlanticCheckout.present(context, checkoutUrl)
```

## Publish (maintainers)

See [`../PUBLISHING.md`](../PUBLISHING.md). Tag `sdks/android/v0.1.0` after Maven Central namespace + GitHub secrets are set.

Docs: [Android Checkout](https://docs.autlantic.com/api/android) · [Mobile apps](https://docs.autlantic.com/guide/mobile)
