# Integrations

Commerce platform plugins built on Autlantic Billing (hosted API + language SDKs).

| Integration | Path | Status | Install | Notes |
|-------------|------|--------|---------|--------|
| WooCommerce | [`woocommerce/`](./woocommerce) | **Published** (mirror zip v1.1.1) | GitHub release zip | Full gateway. Soft WooCommerce Subscriptions. PHP SDK. |
| Magento 2 | [`magento/`](./magento) | Source ready (mirror workflow ready) | Composer `autlantic/module-billing` | Payment method + hosted redirect. PHP SDK. Module `Autlantic_Magento`. |
| Shopify | [`shopify/`](./shopify) | Source ready (mirror workflow ready; Partner approval pending) | Deploy Hono app + payments extension | Offsite payments app. Node SDK. **Checkout listing needs Shopify Payments Partner approval.** |

## Shared behavior

- One-time checkout uses single-use Autlantic **payment links** and hosted checkout (not an in-store card form).
- Webhooks use header `x-autlantic-signature`; each plugin verifies with the portal endpoint secret.
- Store currency must be **USD** or **USDC**.
- One-time payment-link **refunds are manual** (merchant sends USDC back). Invoice refunds via API apply only where an Autlantic invoice id exists (WooCommerce subscriptions path).

Language clients live under [`sdks/`](../sdks). Publishing / mirrors: [`sdks/PUBLISHING.md`](../sdks/PUBLISHING.md).

Do not put Autlantic platform merchant secrets, private GitHub URLs, or internal hostnames in these plugins.
