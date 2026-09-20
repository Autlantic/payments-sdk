# Commerce plugins

Official store plugins for **USDC on Base** via the hosted Autlantic Billing API. They create single-use [payment links](/guide/payment-links), redirect buyers to hosted checkout, and mark orders paid from signed [webhooks](/guide/webhooks).

| Platform | Status | Install | Source |
|----------|--------|---------|--------|
| **WooCommerce** | Available | [GitHub release zip](https://github.com/Autlantic/woocommerce-autlantic/releases) | [`integrations/woocommerce`](https://github.com/Autlantic/payments-sdk/tree/main/integrations/woocommerce) · mirror [woocommerce-autlantic](https://github.com/Autlantic/woocommerce-autlantic) |
| **Magento 2** | Available | Composer `autlantic/module-billing` from [magento-autlantic](https://github.com/Autlantic/magento-autlantic) | [`integrations/magento`](https://github.com/Autlantic/payments-sdk/tree/main/integrations/magento) |
| **Shopify** | Source available | Deploy the offsite payments app | [`integrations/shopify`](https://github.com/Autlantic/payments-sdk/tree/main/integrations/shopify) · mirror [shopify-autlantic](https://github.com/Autlantic/shopify-autlantic) |

Store currency must be **USD** or **USDC**. You need a merchant portal API key (`abk_test_…` / `abk_live_…`) and a webhook endpoint secret.

## Shared checkout flow

1. Customer selects Autlantic at checkout
2. Plugin/app creates `POST /v1/payment-links` (`maxUses: 1`)
3. Customer pays on hosted Autlantic checkout
4. `payment.paid` webhook (header `x-autlantic-signature`) marks the order paid

One-time payment-link **refunds are manual** (merchant sends USDC back). Invoice refunds via API apply only where an Autlantic invoice id exists (WooCommerce Subscriptions path).

## WooCommerce

WordPress plugin zip with the PHP SDK vendored. Upload under Plugins → Add New.

1. WooCommerce → Settings → Payments → **Autlantic Billing**
2. Paste API key and webhook signing secret
3. Register in the Autlantic portal → Webhooks:

   `https://your-store.example/wp-json/autlantic/v1/webhook`

Optional soft dependency: [WooCommerce Subscriptions](https://woocommerce.com/products/woocommerce-subscriptions/) (week / month / year, interval 1). Full README: [integrations/woocommerce](https://github.com/Autlantic/payments-sdk/blob/main/integrations/woocommerce/README.md).

## Magento 2

Composer module `autlantic/module-billing` (Magento module name `Autlantic_Magento`). Requires Magento Open Source / Adobe Commerce 2.4.6+ and PHP 8.1+.

```bash
composer config repositories.autlantic-magento vcs https://github.com/Autlantic/magento-autlantic.git
composer require autlantic/module-billing:^1.0
bin/magento module:enable Autlantic_Magento
bin/magento setup:upgrade
bin/magento cache:flush
```

Also require [`autlantic/billing`](https://packagist.org/packages/autlantic/billing) (Packagist or [billing-php](https://github.com/Autlantic/billing-php)).

1. Stores → Configuration → Sales → Payment Methods → **Autlantic Billing**
2. Enable, paste API key and webhook secret
3. Portal webhook URL:

   `https://your-store.example/autlantic/webhook`

Full README: [integrations/magento](https://github.com/Autlantic/payments-sdk/blob/main/integrations/magento/README.md).

## Shopify

Offsite payments app (Hono) plus a payments extension. **Listing Autlantic at Shopify Checkout requires an approved Shopify Payments Partner app.** Ordinary Partner status is not enough; until approval, merchants cannot enable it on production checkouts.

- Payment session → Autlantic payment link → `{ redirect_url }`
- Autlantic webhook → Shopify `paymentSessionResolve`
- Refund sessions are rejected; one-time refunds are manual

Source and deploy notes: [integrations/shopify](https://github.com/Autlantic/payments-sdk/blob/main/integrations/shopify/README.md) · mirror [shopify-autlantic](https://github.com/Autlantic/shopify-autlantic).

## Related

- [Payment links](/guide/payment-links)
- [Webhooks](/guide/webhooks)
- [Languages and SDKs](/guide/languages)
- [PHP SDK](/api/php)
- [Node.js SDK](/api/nodejs)
