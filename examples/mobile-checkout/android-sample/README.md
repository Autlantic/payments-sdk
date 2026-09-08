# Android Checkout sample

Openable Android app that talks to [`../`](../) (`pnpm example:mobile`) and presents Autlantic Checkout via the local `sdks/android` module (no Maven Central required).

## Run

1. Start the merchant backend:

```bash
cd ../../..   # payments-sdk root
pnpm example:mobile
```

2. Open this folder in Android Studio, or:

```bash
./gradlew :app:assembleDebug
./gradlew :app:installDebug   # with emulator/device attached
```

3. Emulator uses `http://10.0.2.2:3055` (host loopback). On a physical device, set `AUTLANTIC_SAMPLE_BACKEND=http://YOUR_LAN_IP:3055` before install, or edit `backendBase` in `MainActivity`.

## Deep links

Manifest registers `myapp://billing/*` (success / cancel). After return, the app polls `GET /api/access/:merchantRef`.

## Layout

| Path | Role |
|------|------|
| `:app` | Sample UI |
| `:autlantic-checkout` | Local project from `sdks/android/autlantic-checkout` |

See [Mobile apps](https://docs.autlantic.com/guide/mobile).
