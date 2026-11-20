# Server SDK hosted E2E (refund + Connect)

Proof that Python / Go / Java / .NET clients hit live `https://billing.autlantic.com` Test mode for:

1. `createPayment` → checkout sandbox confirm → `refundPayment` → status `refunded`
2. Connect: `listConnectedMerchants` → `provisionConnectedMerchant` → `getConnectedMerchant` → `disableConnectedMerchant`

## Prerequisites

- Platform merchant Test API key (`isPlatform=true`). Child / connected-merchant keys return **403 Platform capability required** for Connect (expected).
- `AUTLANTIC_BILLING_API_URL=https://billing.autlantic.com`
- `AUTLANTIC_BILLING_API_KEY=abk_test_…` (platform)

## Runner

```bash
set -a && source /path/to/platform-billing-e2e.env && set +a
python3 sdks/bin/e2e-hosted-refund-connect.py
```

Go / Java / .NET used the same flow in one-shot harnesses under `/tmp` during the 2026-11-20 align session (create → confirm → refund + Connect provision/disable).

## Result (2026-11-20)

| SDK | Refund | Connect |
|-----|--------|---------|
| Python `0.1.1` | Pass | Pass |
| Go `v0.1.1` | Pass | Pass |
| Java `0.1.2` | Pass | Pass |
| .NET `0.1.1` | Pass | Pass |

Marker: `PYTHON_E2E_OK` / `GO_E2E_OK` / `JAVA_E2E_OK` / `DOTNET_E2E_OK` with `connect=ok`.

Disable leftover `SDK * E2E` connected merchants after runs (`revokeApiKeys: true`).
