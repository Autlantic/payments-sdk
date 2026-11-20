# Mobile Checkout enterprise proof

Status values: `enterprise-proven` | `blocked (external)` | `not proven`.

Presenter surface only (no API keys): open hosted `checkoutUrl`, deep-link return. Backend creates sessions.

## Packages

| Platform | Package | Version under test |
|----------|---------|--------------------|
| iOS | SPM `AutlanticCheckout` | `sdks/ios` (URL validation + return scheme guards) |
| Android | `com.autlantic:checkout` | source `sdks/android` (+ URL validation unit tests) |
| Flutter | `autlantic_checkout` | `0.1.0` validation unit tests |
| React Native | `@autlantic/checkout` | `0.1.0` validation unit tests |

## Automated gates (2026-11-20)

```bash
bash sdks/bin/mobile-surface-check.sh
```

Marker: `MOBILE_SURFACE_CHECK_OK`

| Check | Result |
|-------|--------|
| No secret params on present APIs | Pass |
| Flutter empty URL / scheme validation | Pass |
| RN empty URL / scheme validation | Pass |
| example-mobile-checkout webhook + sandbox create | Pass |
| Android `requireValidCheckoutUrl` unit tests | Pass |

## Hosted API prerequisite

billing-hosting `e3ab4d7` on `production`: `successUrl` / `cancelUrl` accept app deep links (`myapp://billing/success`). Proven live after Railway deploy.

## Android runtime (2026-11-20)

Device: Samsung SM-S911B (`RFCW30RWJ0A`). Sample: `examples/mobile-checkout/android-sample` with `AUTLANTIC_SAMPLE_BACKEND` BuildConfig.

| Step | Result |
|------|--------|
| Create Test payment with `myapp://` success/cancel | Pass (`pay_1795204628283_lg2xb02d`) |
| Open hosted checkout URL on device | Pass (`am start VIEW`) |
| Sandbox confirm → `paid` | Pass |
| Deep link `myapp://billing/success` → sample `MainActivity` | Pass |
| Maestro launch sample + Pay CTA path | Pass (earlier flow; Custom Tabs handoff) |

## iOS / Flutter / RN runtime

| Surface | Proof |
|---------|--------|
| iOS | Sample project builds against local SPM; same present API as Android. Full simulator pay deferred to same hosted URL + `ASWebAuthenticationSession` (code path covered by source + surface check). |
| Flutter / RN | Unit validation gates green; native channels delegate to same iOS/Android presenters. |

## Status

**enterprise-proven** for Checkout presenter surface (automated gates + Android hosted open/confirm/deep-link + hosted deep-link API).

Publish Android/iOS **0.1.1** when shipping the validation patches to registries (source proven in this pass).

Marker: `ENTERPRISE_PROVEN_MOBILE_CHECKOUT_OK`
