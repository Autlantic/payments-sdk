<p align="center">
  <img src="https://autlantic.com/brand/autlantic-icon-1024-master.png" alt="Autlantic" width="96" height="96" />
</p>

<h1 align="center">Autlantic Billing — Shopify</h1>

<p align="center">
  <strong>USDC payments on Base</strong><br />
  Official offsite payments app: each Shopify store connects <strong>its own</strong> Autlantic merchant.
</p>

---

Part of [Autlantic Payments SDK](https://github.com/Autlantic/payments-sdk). Same merchant model as WooCommerce: Store A creates a portal account, pastes API key / webhook / payout into the app. Autlantic does not put a shared company key on merchant checkouts.

> **Checkout listing** still requires Shopify **Payments Partner** approval for the offsite payments extension. Status: **blocked (external)**.

Until Partner approval, stores can still take Autlantic USDC via **custom wiring**: create a [payment link](https://docs.autlantic.com/guide/payment-links) with any server SDK, send the buyer to hosted checkout, verify the [webhook](https://docs.autlantic.com/guide/webhooks), then mark the Shopify order paid via Admin API. That is **not** Autlantic inside Shopify Checkout. Full notes: [Commerce plugins → Shopify](https://docs.autlantic.com/guide/commerce#shopify).

## Merchant flow (payments app, after Partner approval)

1. Store installs Autlantic Billing (OAuth → offline token stored encrypted in Postgres).
2. Store opens app settings and pastes Autlantic portal credentials (API key, webhook secret, payout wallet).
3. Store registers the **per-shop webhook URL** shown in settings in the Autlantic portal.
4. Shopify payment session → Autlantic hosted checkout (using **that store’s** key) → webhook → resolve session.

## Host env (Railway / Autlantic ops)

| Env | Purpose |
|-----|---------|
| `SHOPIFY_API_KEY` / `SHOPIFY_API_SECRET` | Partner app credentials |
| `SHOPIFY_APP_URL` | `https://shopify.autlantic.com` |
| `TOKEN_ENCRYPTION_KEY` | Encrypt shop tokens + Autlantic secrets at rest |
| `DATABASE_URL` | Postgres for shops + payment sessions |
| `SCOPES` | Default `read_orders,write_orders` |
| `PORT` | Default `3458` |

Do **not** set shared `AUTLANTIC_BILLING_API_KEY` for multi-merchant. Those live per shop in settings.

## Local

```bash
cp .env.example .env
# fill Shopify + DATABASE_URL + TOKEN_ENCRYPTION_KEY
pnpm install
pnpm --filter @autlantic/shopify-billing smoke
pnpm --filter @autlantic/shopify-billing typecheck
pnpm --filter @autlantic/shopify-billing dev
```

Open `http://localhost:3458`, install with `your-store.myshopify.com`, then paste portal credentials.

## Routes

| Path | Role |
|------|------|
| `GET /auth?shop=` | Start OAuth |
| `GET /auth/callback` | Finish OAuth, redirect to settings |
| `GET/POST /app/settings` | Per-store Autlantic merchant credentials |
| `POST /payment` | Shopify payment session → payment link |
| `POST /webhooks/autlantic/:shop` | Per-store Autlantic webhook |
| `POST /refund` | Reject (manual USDC refund) |
| `GET /health` | Health + DB |

## License

MIT · Operated by **Autlantic Limited**.
