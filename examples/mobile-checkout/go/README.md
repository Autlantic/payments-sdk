# Go merchant backend (hosted)

Same endpoints as the Node sample, using the Go Billing client.

Port defaults to **3057**.

```bash
export AUTLANTIC_BILLING_API_KEY=abk_test_…
export AUTLANTIC_BILLING_API_URL=https://billing.autlantic.com
export AUTLANTIC_BILLING_MERCHANT_ID=mer_…
export AUTLANTIC_BILLING_WEBHOOK_SECRET=whsec_…
export AUTLANTIC_PAYOUT_ADDRESS_EVM=0x…
go run .
```

Uses a `replace` to the local `sdks/go` module. Point mobile samples at `http://127.0.0.1:3057` (or `10.0.2.2:3057` on Android emulator).
