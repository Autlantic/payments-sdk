# Test & Live

**Portal toggle** for the dashboard, **API keys** for your app, and **checkout** follows the key that created the session.

## How mode is chosen

| Surface | What selects Test vs Live |
|---------|---------------------------|
| Merchant portal | Test / Live toggle (separate products, keys, webhooks, customers) |
| Your app / SDK | `AUTLANTIC_BILLING_API_KEY` (`abk_test_…` or `abk_live_…`) |
| Hosted checkout | Mode stamped on the subscription/payment when created |

Do not rely on `AUTLANTIC_BILLING_SANDBOX` to flip hosted Test/Live. That env is for local in-process sandbox or rare platform overrides.

## Chains

| Mode | Network |
|------|---------|
| Test (`abk_test_…`) | Base Sepolia |
| Live (`abk_live_…`) | Base mainnet |

## Hosted API (recommended path)

1. In the portal, switch to **Test**.
2. Create products, prices, a test API key, and a test webhook endpoint.
3. Put the test key and that endpoint’s signing secret in staging:

```bash
export AUTLANTIC_BILLING_API_URL=https://billing.autlantic.com
export AUTLANTIC_BILLING_API_KEY=abk_test_…
export AUTLANTIC_BILLING_MERCHANT_ID=mer_…
export AUTLANTIC_BILLING_WEBHOOK_SECRET=whsec_…   # Test endpoint secret
```

4. Create a subscription and open `checkoutUrl`. The badge should read **Test · Base Sepolia**.
5. For production, repeat in **Live** with `abk_live_…` and the Live endpoint secret.

## In-process sandbox (no hosted API)

Useful for unit demos and CI without network:

```ts
import { AutlanticBilling } from "@autlantic/payments-recurring";

const billing = AutlanticBilling.sandbox({ merchantId: "mer_demo" });
```

Or:

```bash
export AUTLANTIC_BILLING_SANDBOX=1
```

```ts
const billing = AutlanticBilling.fromEnv(); // no apiBaseUrl → in-process
```

## What to test

1. Create a subscription with a test key and catalog `priceId`.
2. Open hosted checkout and complete Test activation.
3. Create a payment link, open `/checkout/link/:id`, complete pay.
4. Confirm renewals, cancel, refund, and void in Test.
5. Verify webhook signatures with the **Test endpoint** secret.
6. Repeat with a live key only after Test looks good (real USDC on Base).

## Monorepo commands

```bash
pnpm check:recurring-sdk
pnpm --filter @autlantic/payments-recurring example
pnpm test:e2e:recurring-billing
pnpm test:e2e:payment-links
```

Against the **hosted** Test API, set `AUTLANTIC_BILLING_API_KEY=abk_test_…` (portal) and point SDKs at `https://billing.autlantic.com`. In-process sandbox: `AutlanticBilling.sandbox({ … })` (no API required).

More detail: package `TESTING.md` under `packages/payments-recurring`.

## Going live

1. Portal → **Live**: products, live API key, live webhook endpoint.
2. Production env: `abk_live_…` + Live endpoint `whsec_…`.
3. Do **not** set `AUTLANTIC_BILLING_SANDBOX` in production.
4. Confirm hosted checkout shows **Live · Base**.
5. Run `billing-worker` for due renewals (Autlantic ops / your deploy).
