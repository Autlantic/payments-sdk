# Android sample

Minimal Activity that talks to `examples/mobile-checkout` and opens Autlantic Checkout.

## Setup

1. Create an Android app (minSdk 24) and include `sdks/android/autlantic-checkout` as a module dependency.
2. Add internet permission.
3. Register deep link / intent filter for `myapp://billing/success` and `myapp://billing/cancel`.
4. Run `pnpm example:mobile`. Use `10.0.2.2:3055` from the emulator (host loopback).

See `MainActivity.kt`.
