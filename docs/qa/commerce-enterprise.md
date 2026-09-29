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
| Invoice refunds | When invoice id present |
| **Runtime E2E on Magento 2.4.6+** | Required for enterprise-proven |

## Shopify

| Proof | Notes |
|---|---|
| Multi-merchant OAuth + per-shop Autlantic settings | Owned code |
| HMAC + GDPR/uninstall webhooks | Owned code |
| App config `embedded=false` | Owned code |
| Payments extension live checkout | Often **blocked (external)** on Payments Partner |

## Reporting

Do not say enterprise-proven unless Shared + product rows are checked with evidence (commands, URLs, or test run notes) from the current change set.
