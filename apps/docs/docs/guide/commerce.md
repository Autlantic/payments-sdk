# Commerce plugins

Official store plugins for **USDC on Base** via the hosted Autlantic Billing API. They create single-use [payment links](/guide/payment-links), redirect buyers to hosted checkout, and mark orders paid from signed [webhooks](/guide/webhooks).

| Platform | Status | Install | Source |
|----------|--------|---------|--------|
| **WooCommerce** | Available (**1.1.3**) | [GitHub release zip](https://github.com/Autlantic/woocommerce-autlantic/releases) | [`integrations/woocommerce`](https://github.com/Autlantic/payments-sdk/tree/main/integrations/woocommerce) · mirror [woocommerce-autlantic](https://github.com/Autlantic/woocommerce-autlantic) |
| **Magento 2** | Available (**1.1.0**) | Packagist [`autlantic/module-billing`](https://packagist.org/packages/autlantic/module-billing) | [`integrations/magento`](https://github.com/Autlantic/payments-sdk/tree/main/integrations/magento) · mirror [magento-autlantic](https://github.com/Autlantic/magento-autlantic) |
| **Shopify** | Checkout **blocked (external)** on Payments Partner; custom wiring available | See [Shopify](#shopify) below | [`integrations/shopify`](https://github.com/Autlantic/payments-sdk/tree/main/integrations/shopify) · mirror [shopify-autlantic](https://github.com/Autlantic/shopify-autlantic) |

Store currency must be **USD** or **USDC**. You need a merchant portal API key (`abk_test_…` / `abk_live_…`) and a webhook endpoint secret.

## Shared checkout flow

1. Customer selects Autlantic at checkout (Woo / Magento), or follows a payment link (Shopify custom wiring)
2. Plugin/app creates `POST /v1/payment-links` (`maxUses: 1`)
3. Customer pays on hosted Autlantic checkout
4. `payment.paid` webhook (header `x-autlantic-signature`) marks the order paid

One-time payment-link **refunds are manual** (merchant sends USDC back). Invoice refunds via API apply only where an Autlantic invoice id exists (WooCommerce Subscriptions path).

## WooCommerce

WordPress plugin zip with the PHP SDK vendored. Download **1.1.3** from [GitHub releases](https://github.com/Autlantic/woocommerce-autlantic/releases) and upload under Plugins → Add New.

1. WooCommerce → Settings → Payments → **Autlantic Billing**
2. Paste API key and webhook signing secret
3. Register in the Autlantic portal → Webhooks:

   `https://your-store.example/wp-json/autlantic/v1/webhook`

Optional soft dependency: [WooCommerce Subscriptions](https://woocommerce.com/products/woocommerce-subscriptions/) (week / month / year, interval 1). Full README: [integrations/woocommerce](https://github.com/Autlantic/payments-sdk/blob/main/integrations/woocommerce/README.md).

## Magento 2

Composer module [`autlantic/module-billing`](https://packagist.org/packages/autlantic/module-billing) **1.1.0** (Magento module name `Autlantic_Magento`). Requires Magento Open Source / Adobe Commerce 2.4.6+ (or Mage-OS) and PHP 8.1+. Depends on [`autlantic/billing`](https://packagist.org/packages/autlantic/billing) (resolved from Packagist automatically).

**Production (Packagist)**

```bash
composer require autlantic/module-billing:^1.1
bin/magento module:enable Autlantic_Magento
bin/magento setup:upgrade
bin/magento cache:flush
```

**Fallback (VCS mirror)** if Packagist is unavailable:

```bash
composer config repositories.autlantic-magento vcs https://github.com/Autlantic/magento-autlantic.git
composer require autlantic/module-billing:^1.1
```

1. Stores → Configuration → Sales → Payment Methods → **Autlantic Billing**
2. Enable, paste API key and webhook secret
3. Portal webhook URL:

   `https://your-store.example/autlantic/webhook`

Full README: [integrations/magento](https://github.com/Autlantic/payments-sdk/blob/main/integrations/magento/README.md).

## Shopify

### Native checkout payment method

Offsite payments app (Hono) plus a payments extension. **Listing Autlantic at Shopify Checkout requires an approved Shopify Payments Partner app.** Ordinary Partner status is not enough. Until approval, merchants cannot enable Autlantic as a payment method on production checkouts. Status: **blocked (external)**.

Source and deploy notes: [integrations/shopify](https://github.com/Autlantic/payments-sdk/blob/main/integrations/shopify/README.md) · mirror [shopify-autlantic](https://github.com/Autlantic/shopify-autlantic).

### Custom wiring (SDK + payment links)

You can still accept Autlantic USDC for Shopify orders **without** the payments extension by using any [server SDK](/guide/languages) (or the HTTP API) next to Shopify:

1. Create a single-use [payment link](/guide/payment-links) for the order amount (USD/USDC) with your merchant API key
2. Send the customer to the returned hosted checkout URL (email, draft order note, custom button, wholesale portal, etc.)
3. Register a [webhook](/guide/webhooks) endpoint and verify `x-autlantic-signature`
4. On `payment.paid`, mark the Shopify order paid / fulfill via the Shopify Admin API

This is **not** Autlantic inside Shopify Checkout’s payment selector. It is the same payment-link flow as a custom storefront. Suitable for invoices, wholesale, and “pay outside checkout” flows while Payments Partner is pending.

Minimal shape (Node example; same idea in PHP / Python / etc.):

```ts
import { AutlanticBilling } from "@autlantic/payments-recurring";

const billing = AutlanticBilling.fromEnv(); // AUTLANTIC_BILLING_API_KEY + API URL

const { paymentLink, url } = await billing.createPaymentLink({
  amountUsdc: 49,
  maxUses: 1,
  metadata: { shopifyOrderId: "1234567890" },
});
// redirect buyer to url (/checkout/link/:id)
// on payment.paid webhook → Admin API mark order paid using metadata.shopifyOrderId
```

## Related

- [Payment links](/guide/payment-links)
- [Webhooks](/guide/webhooks)
- [Languages and SDKs](/guide/languages)
- [PHP SDK](/api/php)
- [Node.js SDK](/api/nodejs)
