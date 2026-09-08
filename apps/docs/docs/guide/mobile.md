# Mobile apps

Integrate Autlantic Billing into an iOS or Android app the same way Stripe Checkout works: **your backend** creates a session with a secret API key; **the app** opens the returned hosted checkout URL; **webhooks** unlock access.

Do not put `abk_test_*` / `abk_live_*` or webhook secrets in the mobile binary.

## Flow

1. App asks **your** backend for a checkout session (subscription, one-time payment, or payment link).
2. Backend calls Billing `POST /v1/*` (Node SDK or HTTP) and returns `checkoutUrl` (or payment link `url`) plus your app deep-link return URLs.
3. App opens that URL with the Autlantic Checkout SDK (or Custom Tabs / `ASWebAuthenticationSession` until the SDK ships).
4. Customer completes wallet UX on **hosted checkout** (WalletConnect on mobile).
5. Checkout returns to your `successUrl` or `cancelUrl` (app deep link).
6. Billing delivers a signed webhook to your backend. Verify the signature, then grant entitlement.
7. App polls **your** API for access status. Do not call Billing `/v1` from the device with a secret key.

```text
App → Merchant backend → Billing API (/v1)
App → present(checkoutUrl) → Hosted checkout
Billing → signed webhook → Merchant backend → unlock
App → Merchant backend (status)
```

## Return URLs (deep links)

Subscriptions, one-time payments, and payment links accept `successUrl` and `cancelUrl` on create. Use your app’s URL scheme or universal / app links, for example:

- `myapp://billing/success`
- `https://app.example.com/billing/success`

Hosted checkout uses these for the “Return to merchant” / cancel actions. After return, treat the deep link as a signal to refresh status from **your** backend. Unlock only after a verified webhook (`invoice.paid`, `subscription.activated`, `payment.paid`, etc.).

## Official mobile SDKs (in progress)

Swift and Kotlin packages under `sdks/ios` and `sdks/android` expose a small presenter:

```text
AutlanticCheckout.present(url: checkoutUrl, returnUrlScheme: "myapp")
→ completed | canceled | failed
```

Runnable merchant backend sample:

```bash
pnpm example:mobile
# POST http://localhost:3055/api/checkout
```

See [`examples/mobile-checkout`](https://github.com/Autlantic/payments-sdk/tree/main/examples/mobile-checkout).

Until published, open `checkoutUrl` in:

- **Android:** Chrome Custom Tabs
- **iOS:** `ASWebAuthenticationSession` or `SFSafariViewController`

Prefer system browser surfaces so WalletConnect can hand off to wallet apps. Avoid locked WebViews that block wallet deep links.

## What the mobile app must never do

- Ship or embed Autlantic API keys or webhook secrets
- Call authenticated `/v1/*` with a secret from the device
- Verify webhooks on device
- Rebuild vault approve / mandate flows for v1 (use hosted checkout)

## Related

- [Languages and SDKs](/guide/languages)
- [Payment links](/guide/payment-links)
- [Webhooks](/guide/webhooks)
- [Security](/guide/security)
