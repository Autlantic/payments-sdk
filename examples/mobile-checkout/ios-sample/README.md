# iOS Checkout sample

Openable Xcode app that talks to [`../`](../) (`pnpm example:mobile`) and presents Autlantic Checkout via the local `sdks/ios` Swift package.

## Run

1. Start the merchant backend:

```bash
cd ../../..   # payments-sdk root
pnpm example:mobile
```

2. Open the project:

```bash
open CheckoutSample.xcodeproj
```

3. Select an iPhone simulator, set your Team under Signing if needed, then Run.

Simulator uses `http://127.0.0.1:3055`. On a device, change `backendURL` in `CheckoutDemoViewController` to your Mac LAN IP.

## Deep links

`Info.plist` registers URL scheme `myapp` (matches `myapp://billing/success` / cancel from the sample backend).

## Layout

| Path | Role |
|------|------|
| `CheckoutSample/` | App sources |
| `../../../sdks/ios` | Local SPM package `AutlanticCheckout` |

See [Mobile apps](https://docs.autlantic.com/guide/mobile).
