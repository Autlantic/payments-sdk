# Hosted HTTP API

Production API: **`https://billing.autlantic.com`**. Use an official SDK or call `/v1` with your merchant API key.

Authenticate with `x-autlantic-api-key` (or `Authorization: Bearer`). Mode follows the key:

- `abk_test_…` → Test · Base Sepolia
- `abk_live_…` → Live · Base mainnet

Catalog, subscriptions, invoices, payments, payment links, and webhooks are scoped to that mode.

## Machine-readable

| Artifact | URL |
|----------|-----|
| **OpenAPI 3.1** | [OpenAPI guide](/api/openapi) · raw [`/openapi.yaml`](https://docs.autlantic.com/openapi.yaml) |
| **Postman collection** | [Postman guide](/resources/postman) · raw [JSON](https://docs.autlantic.com/postman/autlantic-billing.postman_collection.json) |

Import either into Postman, Insomnia, Speakeasy, or your codegen tool. Production server: `https://billing.autlantic.com`.

## Public checkout (no API key)

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/checkout/subscribe/:id` | Hosted HTML subscription checkout |
| `GET` | `/checkout/subscribe/:id/status` | Fast session status (no Base RPC) |
| `GET` | `/checkout/subscribe/:id/onchain` | Allowance + vault status (Base RPC) |
| `GET` | `/checkout/subscribe/:id.json` | Session JSON (same shape as `/status`) |
| `POST` | `/checkout/subscribe/:id/wallet` | Update customer wallet (incomplete only) |
| `POST` / `DELETE` | `/checkout/subscribe/:id/coupon` | Apply / remove coupon |
| `POST` | `/checkout/subscribe/:id/activate` | Activate (test or live with `{ onChainSubscriptionId }`) |
| `GET` | `/checkout/pay/:id` | Hosted one-time payment checkout |
| `GET` | `/checkout/pay/:id/status` | Payment session JSON |
| `GET` | `/checkout/pay/:id.json` | Payment session JSON (alias of `/status`) |
| `POST` / `DELETE` | `/checkout/pay/:id/coupon` | Apply / remove coupon |
| `POST` | `/checkout/pay/:id/confirm` | Confirm payment (`{ txHash? }`) |
| `GET` | `/checkout/link/:id` | Payment link landing (URL / QR target) |
| `GET` | `/checkout/link/:id/status` | Payment link status JSON |
| `POST` | `/checkout/link/:id/open` | Mint a one-time payment from the link (`{ customerWallet? }`) |

Mutating public checkout routes require a short-lived checkout action token from the session JSON.

## API version

Send `Autlantic-Version: 2026-01-01` (default when omitted). See [API versioning](/guide/api-versioning).

## Authenticated (`X-Autlantic-Api-Key`)

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/v1/products` | List active catalog products and prices |
| `POST` | `/v1/payments` | Create one-time payment (`priceId` once or `amountUsdc`) |
| `GET` | `/v1/payments/:id` | Fetch payment |
| `POST` | `/v1/payment-links` | Create shareable payment link (returns `url`) |
| `GET` | `/v1/payment-links` | List payment links |
| `GET` | `/v1/payment-links/:id` | Fetch payment link |
| `POST` | `/v1/payment-links/:id/disable` | Disable a payment link |
| `GET` | `/v1/subscriptions` | List (`?status=active`) |
| `POST` | `/v1/subscriptions` | Create (`priceId` or `amountUsdc` + `interval`) |
| `GET` | `/v1/subscriptions/:id` | Fetch |
| `PATCH` | `/v1/subscriptions/:id` | Update |
| `POST` | `/v1/subscriptions/:id/complete` | Complete mandate |
| `POST` | `/v1/subscriptions/:id/activate` | Activate |
| `POST` | `/v1/subscriptions/:id/cancel` | Cancel |
| `GET` | `/v1/invoices` | List (`?subscriptionId=`) |
| `GET` | `/v1/invoices/:id` | Fetch |
| `POST` | `/v1/invoices/:id/charge` | Charge |
| `POST` | `/v1/invoices/:id/refund` | Refund |
| `POST` | `/v1/invoices/:id/void` | Void |

### Create payment link body

```json
{
  "amountUsdc": 42,
  "merchantRefPrefix": "invoice",
  "description": "Consulting",
  "maxUses": 1,
  "expiresAt": null,
  "payoutAddressEvm": "0x…"
}
```

Or pass a catalog `priceId` with interval `"once"` instead of `amountUsdc`. Response includes `paymentLink` and `url` (`/checkout/link/:id`). Encode `url` as a QR for in-person or shareable pay.

## Idempotency

Pass `Idempotency-Key` on POST requests. Replays return the cached response for 24 hours.

## Renewals

Due invoices are processed by `apps/billing-worker`. Test invoices sandbox-charge; live invoices use the mainnet vault/relayer path.
