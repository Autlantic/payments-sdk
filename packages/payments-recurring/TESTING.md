# Testing — @autlantic/payments-recurring

## Quick check

```bash
pnpm check:recurring-sdk
pnpm --filter @autlantic/payments-recurring example
```

## Sandbox SDK (in-process)

No billing API required.

```ts
const billing = AutlanticBilling.sandbox({ merchantId: "mer_demo" });
const { subscription, invoice } = await billing.createSubscription({ ... });
await billing.activateSubscription(subscription.id);
```

## Hosted Test API

Use a portal **Test** key against production hosting:

```bash
export AUTLANTIC_BILLING_API_KEY=abk_test_…
export AUTLANTIC_BILLING_API_URL=https://billing.autlantic.com
```

```ts
const billing = AutlanticBilling.fromEnv();
```

Open returned `checkoutUrl` in a browser. Test key: **Pay in test mode** (badge **Test · Base Sepolia**). Live key: **Connect wallet**, then approve and pay on Base mainnet.

E2E scripts in this monorepo:

```bash
pnpm test:e2e:recurring-billing
pnpm test:e2e:payment-links
```

## Failure scenarios (hosted Test)

Exercise declined / insufficient-balance paths via the hosted Test checkout and portal tools where available. Retries follow the default policy: immediate, +1d, +2d, +4d, then `past_due`.

## Going live

1. Portal → **Live**: products, live API key, live webhook endpoint.
2. Production env: `abk_live_…` + Live endpoint `whsec_…`.
3. Do **not** set `AUTLANTIC_BILLING_SANDBOX` in production.
4. Confirm hosted checkout shows **Live · Base**.
