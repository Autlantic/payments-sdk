# Trials enterprise proof

Status values: `enterprise-proven` | `blocked (external)` | `not proven`.

## Already proven (test mode)

See [Trials guide](https://docs.autlantic.com/guide/trials): API matrix + hosted checkout UI ($0 due today, mandate-only, `trial_active`).

## Multi-merchant isolation (2026-11-20)

Runner: `sdks/bin/e2e-trials-multi-merchant.py`

```bash
set -a && source /path/to/merchant-a.env && set +a   # abk_test_* merchant A
export AUTLANTIC_BILLING_API_KEY_B=abk_test_…        # different merchant B
python3 sdks/bin/e2e-trials-multi-merchant.py
```

| Check | Result |
|-------|--------|
| A and B each create `trialDays=7` → `trialing` | Pass |
| Cross-tenant GET / activate / cancel → 404 | Pass |
| A `test_clock` advance does not change B invoice `dueAt` | Pass |
| B `test_clock` independent of A | Pass |
| A sandbox activate stays `trialing`; B untouched | Pass |
| A cancel-in-trial; B still `trialing` | Pass |
| Marker | `ENTERPRISE_PROVEN_TRIALS_MULTI_MERCHANT_OK` |

Status: **enterprise-proven** for multi-merchant isolation under trials (hosted Test).

## Live-mode on-chain conversion

| Check | Status |
|-------|--------|
| Live mandate-only activate stays `trialing` (no charge) | not proven (pending Phase A) |
| Live first USDC charge after `dueAt` → `active` + real `txHash` | not proven (pending Phase B; no test clock in live) |

Do not count `AUTLANTIC_BILLING_ALLOW_LIVE_SANDBOX` as live proof.
