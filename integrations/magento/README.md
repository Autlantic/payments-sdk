<p align="center">
  <img src="https://autlantic.com/brand/autlantic-icon-1024-master.png" alt="Autlantic" width="96" height="96" />
</p>

<h1 align="center">Autlantic Billing — Magento 2</h1>

<p align="center">
  <strong>USDC payments on Base</strong><br />
  Official Magento payment method: single-use payment links, hosted checkout, and signed webhooks.
</p>

<p align="center">
  <a href="https://docs.autlantic.com/guide/commerce"><img src="https://img.shields.io/badge/docs-docs.autlantic.com-5672cd?style=flat-square" alt="Docs" /></a>
  <a href="https://github.com/Autlantic/magento-autlantic"><img src="https://img.shields.io/badge/mirror-magento--autlantic-111827?style=flat-square" alt="Mirror" /></a>
  <a href="https://github.com/Autlantic/payments-sdk/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="MIT License" /></a>
  <a href="https://autlantic.com"><img src="https://img.shields.io/badge/product-autlantic.com-111827?style=flat-square" alt="Autlantic" /></a>
</p>

---

Part of [Autlantic Payments SDK](https://github.com/Autlantic/payments-sdk). Composer package `autlantic/module-billing` **1.0.0** · Magento module `Autlantic_Magento`. Uses [`autlantic/billing`](../../sdks/php).

USDC settles to your merchant payout wallet. Autlantic does not custody checkout funds.

## Why this module

Same hosted Billing API as WooCommerce and the PHP SDK — create a payment link, redirect the buyer to hosted checkout, verify `x-autlantic-signature`, invoice the Magento order. Secrets stay in Magento admin (encrypted).

## Install

**Production (VCS mirror)**

```bash
# Magento root
composer config repositories.autlantic-magento vcs https://github.com/Autlantic/magento-autlantic.git
composer require autlantic/module-billing:^1.0
bin/magento module:enable Autlantic_Magento
bin/magento setup:upgrade
bin/magento cache:flush
```

Also require [`autlantic/billing`](https://packagist.org/packages/autlantic/billing) (Packagist or [`billing-php`](https://github.com/Autlantic/billing-php)).

**Monorepo / development**

```bash
composer config repositories.autlantic-php path /path/to/payments-sdk/sdks/php
composer config repositories.autlantic-magento path /path/to/payments-sdk/integrations/magento
composer require autlantic/module-billing:@dev
bin/magento module:enable Autlantic_Magento
bin/magento setup:upgrade
bin/magento cache:flush
```

Requires Magento Open Source / Adobe Commerce **2.4.6+**, PHP **8.1+** (`ext-curl`, `ext-json`, `ext-hash`). Store currency **USD** or **USDC**.

## Quick start

1. Stores → Configuration → Sales → Payment Methods → **Autlantic Billing**
2. Enable; paste API key (`abk_test_…` / `abk_live_…`) and webhook signing secret
3. Portal → Webhooks → register:

   `https://your-store.example/autlantic/webhook`

4. Place a test order with Autlantic → pay on hosted checkout → order invoices on `payment.paid`

## What it does

| Feature | Behavior |
|---------|----------|
| One-time checkout | `POST /v1/payment-links` (`maxUses: 1`), redirect via `autlantic/payment/redirect` |
| Webhooks | `POST /autlantic/webhook` → offline invoice + configured status |
| Refunds | One-time payment-link refunds are **manual** (merchant sends USDC back) |
| Subscriptions | Not included in this module |

## Webhooks

Verify `x-autlantic-signature` with the portal endpoint secret that matches the API key mode (Test or Live). Idempotent event ids and a short activity ring use Magento `FlagManager` (no custom tables).

## Documentation

| | |
|--|--|
| [Commerce plugins](https://docs.autlantic.com/guide/commerce) | Woo / Magento / Shopify |
| [Languages](https://docs.autlantic.com/guide/languages) | All SDK surfaces |
| [Webhooks](https://docs.autlantic.com/guide/webhooks) | Signature & events |
| [PHP SDK](https://docs.autlantic.com/api/php) | `autlantic/billing` |
| [Terms](https://autlantic.com/terms) · [Privacy](https://autlantic.com/privacy) · [Security](https://autlantic.com/security) | Legal |

## Develop

```bash
php integrations/magento/bin/smoke.php
```

On tag `integrations/magento/v*`, [`.github/workflows/sync-magento-mirror.yml`](../../.github/workflows/sync-magento-mirror.yml) syncs [magento-autlantic](https://github.com/Autlantic/magento-autlantic).

## License

MIT · Operated by **Autlantic Limited** (UK company no. 17422039).

Part of [Autlantic Payments SDK](https://github.com/Autlantic/payments-sdk).
