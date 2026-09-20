# Autlantic Billing for Magento 2

Payment method for **USDC on Base** via the hosted Autlantic Billing API.

Source of truth: `integrations/magento` in [payments-sdk](https://github.com/Autlantic/payments-sdk). Depends on [`autlantic/billing`](../../sdks/php) (PHP SDK). Composer package: `autlantic/module-billing` **1.0.0**. Magento module name: `Autlantic_Magento`.

## What it does

| Feature | Behavior |
|---------|----------|
| One-time checkout | Creates a single-use payment link, redirects to hosted Autlantic checkout |
| Webhooks | `POST /autlantic/webhook` verifies `x-autlantic-signature`, invoices the Magento order |
| Refunds | One-time payment-link refunds are **manual** (merchant sends USDC back). No Autlantic invoice id on this path. |
| Store currency | **USD** or **USDC** only |
| Subscriptions | Not included in this module (use the API / WooCommerce path for recurring) |

## Requirements

- Magento Open Source / Adobe Commerce **2.4.6+** (tested on Mage-OS / Magento 2.4.9)
- PHP **8.1+** with `ext-curl`, `ext-json`, `ext-hash`
- Composer access to `autlantic/billing` (Packagist, VCS mirror, or path repo in this monorepo)
- Autlantic merchant portal API key (`abk_test_…` or `abk_live_…`) and webhook endpoint secret

## Install (production / VCS mirror)

When the public mirror is live ([`Autlantic/magento-autlantic`](https://github.com/Autlantic/magento-autlantic)):

```bash
# Magento root
composer config repositories.autlantic-magento vcs https://github.com/Autlantic/magento-autlantic.git
composer require autlantic/module-billing:^1.0
bin/magento module:enable Autlantic_Magento
bin/magento setup:upgrade
bin/magento cache:flush
```

Until Packagist indexes the package, keep the `repositories.autlantic-magento` VCS entry. Also require `autlantic/billing` from Packagist or [`billing-php`](https://github.com/Autlantic/billing-php).

## Install (monorepo / development)

```bash
# Magento root
composer config repositories.autlantic-php path /path/to/payments-sdk/sdks/php
composer config repositories.autlantic-magento path /path/to/payments-sdk/integrations/magento
composer require autlantic/module-billing:@dev
bin/magento module:enable Autlantic_Magento
bin/magento setup:upgrade
bin/magento cache:flush
```

Local smoke (no Magento bootstrap; webhook crypto only):

```bash
php integrations/magento/bin/smoke.php
```

## Configure

1. **Stores → Configuration → Sales → Payment Methods → Autlantic Billing**
2. Enable the method. Paste **API key** and **Webhook signing secret** (stored encrypted).
3. Optional: Merchant ID, payout wallet override, API base URL (default `https://billing.autlantic.com`), order status after payment (`processing` or `complete`).
4. In the Autlantic portal → Webhooks, register the matching Test or Live endpoint:

   `https://your-store.example/autlantic/webhook`

Use HTTPS on the storefront webhook URL in production. The PHP built-in server is fine for local demos only.

## Checkout flow

1. Customer places the order with **Autlantic** selected
2. Magento redirects to `autlantic/payment/redirect`, which creates `POST /v1/payment-links` (`maxUses: 1`, metadata `m2_order_id` / `m2_increment_id`)
3. Customer pays on hosted Autlantic checkout
4. `payment.paid` (or `invoice.paid`) webhook → Magento offline invoice + configured order status

Order identifiers are stored on the payment `additional_information` keys (`autlantic_payment_link_id`, `autlantic_payment_id`, `autlantic_tx_hash`, …). Webhook activity and processed-event ids use Magento `FlagManager` (no custom tables).

## Limits (honest)

- One-time payment-link refunds are not available via Magento admin or the Autlantic payment API; the merchant sends USDC back manually.
- This module does not create Autlantic subscriptions.
- Webhook delivery must reach your store (public HTTPS, or a tunnel for local tests). Signature verification uses the portal endpoint secret.

## Development notes

- Do not put Autlantic platform secrets or private hostnames in this module. Merchants use their own portal credentials.
- Billing logic stays in the hosted API; this module only maps Magento orders ↔ Autlantic IDs.
- Controllers must not be declared `final` (Magento generates interceptors).
- Module name is `Autlantic_Magento` so Magento routing resolves `Autlantic\Magento\…` controllers; the Composer package name remains `autlantic/module-billing`.
- Published `composer.json` has no path repositories; monorepo installs add path repos on the **Magento root** (see above).

## Mirror

Source of truth stays in this repo. On tag `integrations/magento/v*`, [`.github/workflows/sync-magento-mirror.yml`](../../.github/workflows/sync-magento-mirror.yml) pushes to **https://github.com/Autlantic/magento-autlantic**.

One-time: create the empty public repo `Autlantic/magento-autlantic`, then add Actions secret **`MAGENTO_MIRROR_TOKEN`** (PAT with `contents:write` on that repo).

## License

MIT · Autlantic Limited (UK company no. 17422039)
