# Commerce enterprise-proven checklist

Use this before calling Woo, Magento, or Shopify **enterprise-proven**.

Status values: `enterprise-proven` | `blocked (external)` | `not proven`.

## Shared (all commerce plugins)

| Proof | Pass when |
|---|---|
| Merchant credentials in admin (not shared host env hacks) | Per-store/website keys + webhook secret |
| HMAC webhook verify | Bad sig 401; good sig accepts; empty secret fails closed |
| Idempotent events | Duplicate delivery safe |
| Checkout path | Buyer reaches hosted Autlantic checkout; success does not race away |
| Order paid path | Webhook marks order paid/invoiced |
| Admin operability | Test connection + recent webhook activity + order shows Autlantic ids |
| Refunds (if claimed) | Admin refund/credit memo hits Autlantic when invoice id exists |
| Packaging | Release/tag/mirror or WP.org zip built from CI/package script |
| Automated gate | Package/module smoke + lint/tests green |
| Runtime E2E | Real store stack: place order → pay (test mode) → webhook → paid |

## WooCommerce reference

Current reference bar: enqueue-safe admin JS, `Requires Plugins`, clean activation, HMAC `permission_callback`, WordPress HTTP API in WP.org zip, refunds + optional subscriptions.

## Magento

| Proof | Notes |
|---|---|
| `redirectAfterPlaceOrder: false` | No success-page race |
| Website-scoped webhook secrets | Multi-website verify |
| Indexed id → order lookup | Not scan-only |
| Admin test connection / activity / order panel | Required |
| Invoice refunds | When Autlantic invoice id present (payment-link checkouts correctly block) |
| **Runtime E2E on Magento 2.4.6+ / Mage-OS** | Required for enterprise-proven |

### Magento runtime proof (2026-09-29, baseline 1.1.0)

Environment: local Mage-OS **3.3.0** (Magento **2.4.9**), MariaDB `mageos`, OpenSearch, `http://127.0.0.1:8089`.

Packagist install of `autlantic/module-billing` **1.1.0** + `autlantic/billing` **0.1.0** → `ENTERPRISE_PROVEN_MAGENTO_E2E_OK` (order `#000000006`). Covered checkout link, HMAC, invoice-on-paid, duplicate safety, refund-blocked-without-ids.

### Magento runtime proof (2026-11-20, refundPayment 1.1.1/1.1.2 + PHP 0.1.1)

Same Mage-OS stack. Gap found in verification: Magento **1.1.1** calls `refundPayment`, but Packagist still only had `autlantic/billing` **0.1.0** (method missing). Published PHP **0.1.1**, then Packagist-only reinstall (no path symlink) and re-ran E2E. **1.1.2** pins `autlantic/billing` **^0.1.1**.

| Check | Result |
|---|---|
| Packagist `autlantic/billing` **0.1.1** (not path) | Pass |
| Packagist `autlantic/module-billing` **1.1.1** (module code; **1.1.2** adds require pin) | Pass |
| PHPUnit `sdks/php` (incl. refundPayment path) | Pass |
| Magento `bin/unit.php` + `bin/smoke.php` | Pass |
| Sandbox `createPayment` → checkout confirm → paid | Pass |
| HMAC bad/good + `payment.paid` invoice | Pass |
| Magento `refundPayment` → Billing status `refunded` | Pass |
| HTTP `payment.refunded` | Pass |
| Marker | `ENTERPRISE_PROVEN_MAGENTO_E2E_OK` order `#000000010` |

Command:

```bash
set -a && source /path/to/billing-e2e.env && set +a   # abk_test_* + whsec_* + API URL
MAGE_ROOT=/path/to/mageos php integrations/magento/bin/e2e-mageos.php
```

Status: **enterprise-proven** for Magento one-time checkout + webhooks + admin operability + **one-time `refundPayment`** (requires `autlantic/billing` **>=0.1.1**).

## Shopify

| Proof | Notes |
|---|---|
| Multi-merchant OAuth + per-shop Autlantic settings | Owned code |
| HMAC + GDPR/uninstall webhooks | Owned code |
| App config `embedded=false` | Owned code |
| Merchant diagnostics (readiness, test connection, activity, session ids / last error) | Owned code (**1.1.2**) |
| One-time `refundPayment` + `payment.refunded` session update | Owned code (**1.1.2**); needs Payments Partner for live refund sessions |
| Payments extension live checkout | **blocked (external)** on Payments Partner |
| Custom wiring (SDK + payment links + Admin API) | Documented; not a substitute for native checkout listing |

### Shopify owned-code proof (2026-11-20)

Automated: `pnpm --filter @autlantic/shopify-billing smoke` + `typecheck` + `build`.

Runtime (local Postgres + real Autlantic Test API; Shopify Payments Apps GraphQL stubbed via `AUTLANTIC_SHOPIFY_E2E_STUB=1` only for that harness):

```bash
set -a && source /path/to/billing-e2e.env && set +a
DATABASE_URL=postgresql://localhost/shopify_autlantic_e2e DATABASE_SSL=false \
  pnpm --filter @autlantic/shopify-billing e2e
```

Observed: `ENTERPRISE_PROVEN_SHOPIFY_OWNED_E2E_OK` (test-connection, Autlantic HMAC, payment.paid → payment id, refundPayment → Billing `refunded`, payment.refunded, Shopify bad HMAC).

Status: **owned code enterprise-ready** for OAuth, per-shop credentials, HMAC/GDPR, admin diagnostics, and refundPayment wiring. Native Checkout listing remains **blocked (external)** until Payments Partner approval.

## Reporting

Do not say enterprise-proven unless Shared + product rows are checked with evidence (commands, URLs, or test run notes) from the current change set.
