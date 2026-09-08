# Java merchant backend (hosted)

Same endpoints as the PHP/Node samples, using `com.autlantic:autlantic-billing`.

Port **3059**.

```bash
export AUTLANTIC_BILLING_API_KEY=abk_test_…
export AUTLANTIC_BILLING_API_URL=https://billing.autlantic.com
export AUTLANTIC_BILLING_MERCHANT_ID=mer_…
export AUTLANTIC_BILLING_WEBHOOK_SECRET=whsec_…
export AUTLANTIC_PAYOUT_ADDRESS_EVM=0x…
./gradlew run
```

Point mobile samples at `http://127.0.0.1:3059` (or `10.0.2.2:3059` on Android emulator).
