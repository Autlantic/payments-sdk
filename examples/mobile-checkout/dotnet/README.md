# .NET merchant backend (hosted)

Same endpoints as the PHP/Node samples, using `Autlantic.Billing`.

Port **3060**.

```bash
export AUTLANTIC_BILLING_API_KEY=abk_test_…
export AUTLANTIC_BILLING_API_URL=https://billing.autlantic.com
export AUTLANTIC_BILLING_MERCHANT_ID=mer_…
export AUTLANTIC_BILLING_WEBHOOK_SECRET=whsec_…
export AUTLANTIC_PAYOUT_ADDRESS_EVM=0x…
dotnet run
```

Point mobile samples at `http://127.0.0.1:3060` (or `10.0.2.2:3060` on Android emulator).
