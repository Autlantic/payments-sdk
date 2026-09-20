<p align="center">
  <img src="https://autlantic.com/brand/autlantic-icon-1024-master.png" alt="Autlantic" width="96" height="96" />
</p>

<h1 align="center">Autlantic Billing — Integrations</h1>

<p align="center">
  <strong>USDC payments on Base</strong><br />
  Official commerce plugins for WooCommerce, Magento 2, and Shopify.
</p>

<p align="center">
  <a href="https://docs.autlantic.com/guide/commerce"><img src="https://img.shields.io/badge/docs-docs.autlantic.com-5672cd?style=flat-square" alt="Docs" /></a>
  <a href="https://github.com/Autlantic/payments-sdk/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="MIT License" /></a>
  <a href="https://autlantic.com"><img src="https://img.shields.io/badge/product-autlantic.com-111827?style=flat-square" alt="Autlantic" /></a>
</p>

---

Part of [Autlantic Payments SDK](https://github.com/Autlantic/payments-sdk). Language clients live under [`sdks/`](../sdks).

| Integration | Path | Status | Install |
|-------------|------|--------|---------|
| WooCommerce | [`woocommerce/`](./woocommerce) | Published (zip **1.1.1**) | [GitHub release](https://github.com/Autlantic/woocommerce-autlantic/releases) |
| Magento 2 | [`magento/`](./magento) | Published (Composer **1.0.0**) | [magento-autlantic](https://github.com/Autlantic/magento-autlantic) |
| Shopify | [`shopify/`](./shopify) | Source published; Payments Partner approval for checkout | [shopify-autlantic](https://github.com/Autlantic/shopify-autlantic) |

## Shared behavior

- One-time checkout uses single-use Autlantic **payment links** and hosted checkout
- Webhooks use `x-autlantic-signature` and the portal endpoint secret
- Store currency must be **USD** or **USDC**
- One-time payment-link **refunds are manual**; invoice refunds apply where an Autlantic invoice id exists (Woo subscriptions path)

Publishing / mirrors: [`sdks/PUBLISHING.md`](../sdks/PUBLISHING.md) · Docs: [Commerce plugins](https://docs.autlantic.com/guide/commerce).

## License

MIT · Operated by **Autlantic Limited** (UK company no. 17422039).
