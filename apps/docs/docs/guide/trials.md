# Subscription trials

Connect the customer wallet (mandate) up front. Grant access during a free trial. **Charge the first USDC invoice after `trialDays`.** Cancel during the trial collects **$0**.

## Status

| Capability | Status |
|------------|--------|
| Catalog field `Price.trialDays` | Available in portal / API |
| Engine: `trialing` + delayed first `dueAt` | Implemented in SDK (this release) |
| Hosted API passes `price.trialDays` into create | Requires billing-hosting pin of published engine |
| Merchant-facing “live trial billing” claim | **not proven** until hosted E2E matrix passes |

Until hosting + Autlantic (or your app) complete the [enterprise proof matrix](#enterprise-proof), treat charge-after-trial as **not proven** in production marketing.

## Product rules

1. Create a recurring price with `trialDays` (whole days, `0` = no trial).
2. `createSubscription` with that `priceId` (or sandbox `trialDays`) starts the subscription as **`trialing`**.
3. First open invoice exists with **`dueAt = trial end`**. It is not chargeable yet.
4. Checkout / activate completes the **mandate only** while the invoice is not due. Status stays `trialing`.
5. When `dueAt` arrives, the worker (or `chargeInvoice`) collects the first payment → status **`active`**, paid period starts.
6. Cancel while `trialing` ends immediately and **voids** the open invoice (no charge).
7. One-time / `interval: once` prices do not use trials.

## Sequence

```mermaid
sequenceDiagram
  participant App
  participant Billing
  participant Wallet

  App->>Billing: createSubscription priceId with trialDays
  Billing-->>App: subscription trialing, invoice dueAt trialEnd
  Wallet->>Billing: activate / complete mandate
  Billing-->>App: mandate active, still trialing, no paid invoice
  Note over Billing: Wait until dueAt
  Billing->>Billing: charge first invoice
  Billing-->>App: invoice.paid, subscription active
```

## API surface

- **Catalog:** `POST /v1/products` nested `price.trialDays`, `POST /v1/products/:id/prices`, `PATCH /v1/prices/:id`
- **Subscribe:** `POST /v1/subscriptions` with `priceId` (hosted resolves trial from the price)
- **Sandbox SDK:** `createSubscription({ amountUsdc, interval, trialDays })`
- **Lifecycle:** see [Lifecycle](/guide/lifecycle) for the `trialing` state

## Webhooks your app should handle

| Event | Trial meaning |
|-------|----------------|
| `subscription.created` | Often `status: trialing` when `trialDays > 0` |
| `subscription.activated` | Mandate active; may still be `trialing` (no charge yet) |
| `invoice.paid` | First (or renewal) charge succeeded → treat as paid entitlement |
| `subscription.canceled` | Including cancel-in-trial; revoke access; expect no paid invoice |

Grant **trial access** when the mandate is active and status is `trialing`. Convert to a **paid period** on `invoice.paid`. Do not invent a host-only “fake trial” that still charges on activate.

## Enterprise proof

Do not mark trials **enterprise-proven** until:

1. Engine unit tests for create / mandate-without-charge / charge-after-due / cancel-in-trial
2. Published npm packages pinned on billing-hosting
3. Hosted E2E: trialDays=7 → mandate → $0 → due charge → active; cancel-in-trial → $0; trialDays=0 unchanged; multi-merchant isolation

## Related

- [Lifecycle](/guide/lifecycle)
- [Sandbox](/guide/sandbox)
- [Webhooks](/guide/webhooks)
- [Changelog](/resources/changelog)
