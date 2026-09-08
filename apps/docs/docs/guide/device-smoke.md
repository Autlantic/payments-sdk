# Device smoke test (Test mode)

End-to-end check on a **real phone or simulator** with hosted Test keys (`abk_test_*`). Confirms: merchant backend → Billing API → hosted checkout → deep link return → webhook → access poll.

Do **not** put API keys or webhook secrets in the mobile app.

## What you need

| Piece | Notes |
|-------|--------|
| Test API key | Portal → `abk_test_…` |
| Merchant id | `mer_…` |
| Webhook secret | Portal endpoint secret for Test |
| Payout address | Test EVM address (`AUTLANTIC_PAYOUT_ADDRESS_EVM`) |
| Wallet on device | WalletConnect-capable wallet (Test / Base Sepolia as configured for Test) |
| Local backend reachable | Simulator: `127.0.0.1` / `10.0.2.2`. Device: your Mac LAN IP |

## 1. Start the sample backend (hosted Test)

From the payments-sdk repo:

```bash
export AUTLANTIC_BILLING_API_KEY=abk_test_…
export AUTLANTIC_BILLING_API_URL=https://billing.autlantic.com
export AUTLANTIC_BILLING_MERCHANT_ID=mer_…
export AUTLANTIC_BILLING_WEBHOOK_SECRET=whsec_…
export AUTLANTIC_PAYOUT_ADDRESS_EVM=0x…
export MOBILE_RETURN_SCHEME=myapp   # optional; default myapp

pnpm example:mobile
# → http://localhost:3055
```

Sanity check:

```bash
curl -s http://127.0.0.1:3055/health
```

Expect `"mode":"hosted"` (not `"sandbox"`).

### Webhook delivery to localhost

Billing cannot reach `localhost` from the cloud. For a full webhook unlock on device:

1. Expose the sample with a tunnel (ngrok, Cloudflare Tunnel, etc.) to `POST /webhooks/autlantic`.
2. In the **merchant portal** (Test), set the webhook URL to `https://YOUR_TUNNEL/webhooks/autlantic` and use that endpoint’s signing secret as `AUTLANTIC_BILLING_WEBHOOK_SECRET`.

Without a tunnel you can still smoke **checkout open + deep link return**; access may stay `"Waiting for webhook…"` until a signed event arrives.

## 2. Point the app at the backend

| Client | Backend URL |
|--------|-------------|
| iOS Simulator | `http://127.0.0.1:3055` |
| Android Emulator | `http://10.0.2.2:3055` |
| Physical device | `http://YOUR_LAN_IP:3055` (same Wi‑Fi; allow cleartext / ATS local networking as in samples) |

Deep links must match the backend return URLs (default):

- `myapp://billing/success`
- `myapp://billing/cancel`

## 3. Run a client

### iOS sample

```bash
open examples/mobile-checkout/ios-sample/CheckoutSample.xcodeproj
```

Set Team if needed → Run on simulator/device → **Pay with Autlantic**.

### Android sample

```bash
cd examples/mobile-checkout/android-sample
./gradlew :app:installDebug
```

Emulator uses `10.0.2.2` by default. On a device, set `AUTLANTIC_SAMPLE_BACKEND` or edit `backendBase` in `MainActivity`.

### Flutter / React Native

Use [`sdks/flutter`](https://github.com/Autlantic/payments-sdk/tree/main/sdks/flutter) or [`sdks/react-native`](https://github.com/Autlantic/payments-sdk/tree/main/sdks/react-native) in a host app:

1. `POST` your backend `/api/checkout` → `checkoutUrl` + `merchantRef`.
2. `AutlanticCheckout.present(checkoutUrl, returnUrlScheme: 'myapp')`.
3. On return, poll `GET /api/access/:merchantRef` until `active === true`.

Register the `myapp` URL scheme / intent filter like the native samples.

## 4. Pass criteria

| Step | Expect |
|------|--------|
| Create session | `201` with `https://…/checkout/…` (not `sandbox://`) |
| Present | System browser / Custom Tabs / ASWebAuth opens hosted checkout |
| Pay | Complete Test wallet flow on hosted checkout |
| Return | App opens via `myapp://billing/success` (or cancel) |
| Webhook | Backend logs verified event; `GET /api/access/:ref` → `"active": true` |

## 5. Common failures

| Symptom | Likely cause |
|---------|----------------|
| `sandbox://` checkout URL | Backend running without `AUTLANTIC_BILLING_API_KEY` |
| Cannot reach backend from phone | Wrong host (use LAN IP); firewall; cleartext blocked |
| Checkout opens then stuck | WalletConnect / network; try again on device with wallet installed |
| Return never hits app | URL scheme / intent filter mismatch vs `successUrl` |
| Access never active | Webhook not reaching tunnel; wrong secret; portal URL wrong |

## Related

- [Mobile apps](/guide/mobile)
- [Sandbox & testing](/guide/sandbox)
- [Local webhooks](/guide/local-webhooks)
- [Webhooks](/guide/webhooks)
- Sample backend: [`examples/mobile-checkout`](https://github.com/Autlantic/payments-sdk/tree/main/examples/mobile-checkout)
