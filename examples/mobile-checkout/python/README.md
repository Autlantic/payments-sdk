# Python merchant backend (hosted)

Same endpoints as the Node sample (`/api/checkout`, `/api/access/:ref`, `/webhooks/autlantic`), using `autlantic-billing`.

Port defaults to **3056** so it can run beside `pnpm example:mobile` (3055).

```bash
cd ../../sdks/python && pip install -e .
cd ../../examples/mobile-checkout/python
export AUTLANTIC_BILLING_API_KEY=abk_test_…
export AUTLANTIC_BILLING_API_URL=https://billing.autlantic.com
export AUTLANTIC_BILLING_MERCHANT_ID=mer_…
export AUTLANTIC_BILLING_WEBHOOK_SECRET=whsec_…
export AUTLANTIC_PAYOUT_ADDRESS_EVM=0x…
python server.py
```

Point the iOS/Android sample `backendURL` / `backendBase` at `http://127.0.0.1:3056` (or `10.0.2.2:3056` on Android emulator).
