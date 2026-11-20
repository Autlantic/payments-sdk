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

## Result (2026-11-20) automated harness

| SDK | Refund | Connect |
|-----|--------|---------|
| Python `0.1.1` | Pass | Pass |
| Go `v0.1.1` | Pass | Pass |
| Java `0.1.2` | Pass | Pass |
| .NET `0.1.1` | Pass | Pass |

Marker: `PYTHON_E2E_OK` / `GO_E2E_OK` / `JAVA_E2E_OK` / `DOTNET_E2E_OK` with `connect=ok`.

## Result (2026-11-20) human-style (registry install + browser checkout)

Installed each client from its public registry (not local path), created a Test payment, paid via hosted checkout (browser / Playwright sandbox confirm), then refunded and ran Connect with that same published client.

| SDK | Registry | Version | Checkout pay | Refund | Connect |
|-----|----------|---------|--------------|--------|---------|
| Python | PyPI `autlantic-billing` | `0.1.1` | Pass (`pay_1795201331844_ba2eqvlo`) | Pass | Pass |
| Go | `github.com/Autlantic/payments-sdk/sdks/go` | `v0.1.1` | Pass (`pay_1795201403694_dvuixq1c`) | Pass | Pass |
| PHP | Packagist `autlantic/billing` | `0.1.1` | Pass (`pay_1795201414702_qspbg84a`) | Pass | Pass |
| .NET | NuGet `Autlantic.Billing` | `0.1.1` | Pass (`pay_1795201455180_7b08vron`) | Pass | Pass |
| Node | npm `@autlantic/payments-recurring` | `0.3.24` | Pass (`pay_1795201459585_erbnzubu`) | Pass | Pass |
| Java | Maven Central `com.autlantic:billing` | `0.1.2` | Pass (`pay_1795201464873_rms782fm`) | Pass | Pass |

All six payment IDs ended `status=refunded` via API after SDK refunds. Connected merchants from this pass were disabled with `revokeApiKeys: true`.

Disable leftover `SDK * E2E` / `Human E2E *` connected merchants after runs (`revokeApiKeys: true`).
