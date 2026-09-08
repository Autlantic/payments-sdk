# PHP merchant backend (hosted)

Same endpoints as the Node sample, using `autlantic/billing`.

Port **3058**.

```bash
composer install
export AUTLANTIC_BILLING_API_KEY=abk_test_…
export AUTLANTIC_BILLING_API_URL=https://billing.autlantic.com
export AUTLANTIC_BILLING_MERCHANT_ID=mer_…
export AUTLANTIC_BILLING_WEBHOOK_SECRET=whsec_…
export AUTLANTIC_PAYOUT_ADDRESS_EVM=0x…
php -S 0.0.0.0:3058 server.php
```

Point mobile samples at `http://127.0.0.1:3058` (or `10.0.2.2:3058` on Android emulator).
