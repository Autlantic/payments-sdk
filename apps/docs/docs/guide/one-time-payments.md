# One-time payments

Autlantic Billing supports **one-time USDC** payments alongside recurring subscriptions.

- Buyer sends USDC once to the merchant payout wallet
- No vault mandate, allowance, or renewals
- Hosted checkout at `/checkout/pay/:id` (mirrors `/checkout/subscribe/:id`)

## Catalog price

In the merchant portal, create a product price with interval **One-time** (`once`).

Recurring subscriptions reject `once` prices. Use `POST /v1/payments` (or `createPayment`) instead.

## SDK (sandbox)

```ts
import { AutlanticBilling } from "@autlantic/payments-recurring";

const billing = AutlanticBilling.sandbox({ merchantId: "mer_demo" });

const { payment, checkoutUrl } = await billing.createPayment({
  merchantRef: order.id,
  customerWallet: member.walletAddress,
  payoutAddressEvm: creator.payoutAddressEvm,
  amountUsdc: 49,
});

// Sandbox: confirm without a real chain transfer
await billing.confirmPayment(payment.id);
```

## SDK (hosted)

```ts
const billing = AutlanticBilling.fromEnv();

const { payment, checkoutUrl } = await billing.createPayment({
  merchantRef: order.id,
  customerWallet: member.walletAddress,
  payoutAddressEvm: creator.payoutAddressEvm,
  priceId, // catalog price with interval "once"
});

// Redirect the buyer to Autlantic hosted checkout
// checkoutUrl → GET /checkout/pay/:id
```

On the hosted page:

- Sandbox: **Simulate USDC transfer**
- Live: **Connect wallet** (EIP-6963 / WalletConnect) → send USDC from the browser wallet → checkout confirms on-chain
- Optional: apply or remove a portal coupon before paying (`POST` / `DELETE` `/checkout/pay/:id/coupon`). Merchant coupon CRUD: [Coupons](/guide/coupons).

Confirmation uses `verifyUsdcPassPaymentFromTxHash` from `@autlantic/chain-evm`.

## HTTP

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/v1/payments` | Create payment (`priceId` once, or `amountUsdc`) |
| `GET` | `/v1/payments/:id` | Fetch payment |
| `GET` | `/checkout/pay/:id` | Hosted React checkout |
| `GET` | `/checkout/pay/:id/status` | Enriched session + paid state |
| `GET` | `/checkout/pay/:id.json` | Same as `/status` |
| `POST` | `/checkout/pay/:id/confirm` | Sandbox mark paid, or verify `{ txHash }` |
| `POST` | `/checkout/pay/:id/coupon` | Apply merchant coupon (`{ code }`) |
| `DELETE` | `/checkout/pay/:id/coupon` | Remove applied coupon; restore list price |

## Webhooks

| Event | When |
|-------|------|
| `payment.created` | Payment created (`open`) |
| `payment.paid` | Payment confirmed |

## Low-level chain helpers

If you settle outside hosted checkout, use `@autlantic/chain-evm`:

- `encodeTransferCalldata`
- `UsdcPassPaymentIntent`
- `verifyUsdcPassPaymentFromTxHash`

## Receipts / PDF

After a one-time payment is confirmed, hosted checkout shows **Download receipt PDF** and **Download invoice PDF** (signed portal links, same pattern as subscription checkout).

Receipts use payment framing (one-time charge, PAID stamp). Invoice PDFs use the payment id as the document id.

## Example

See [`examples/subscription-store`](https://github.com/autlantic/payments-sdk/tree/main/examples/subscription-store): sandbox keeps a local simulate flow; hosted mode redirects to `checkoutUrl`.
