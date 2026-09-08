# SampleApp

Minimal iOS host for `AutlanticCheckout`.

## Setup

1. Open Xcode → File → Add Package Dependencies → Add Local → select `../../` (`sdks/ios`).
2. Or add this folder as an app target that depends on the `AutlanticCheckout` package.
3. In Info.plist, register URL scheme `myapp` (or change `returnURLScheme` below).
4. Point `backendURL` at `http://localhost:3055` (simulator) or your Mac LAN IP (device).
5. Run `pnpm example:mobile` in the payments-sdk repo.

## Flow

```swift
// 1. POST backendURL/api/checkout → checkoutUrl
// 2. AutlanticCheckout.present(url:returnURLScheme:from:)
// 3. On success deep link, GET /api/access/:merchantRef
```

See `CheckoutDemoViewController.swift`.
