# Lifecycle

How a USDC subscription moves from create → activate → renew → fail/retry → cancel, and which webhooks fire.

## Happy path (no trial)

```mermaid
sequenceDiagram
  participant App as Your backend
  participant SDK as AutlanticBilling
  participant Chain as Base / vault
  participant Hook as Your webhook URL

  App->>SDK: createSubscription(...)
  SDK-->>App: subscription incomplete + open invoice
  Note over Hook: subscription.created, invoice.created

  App->>SDK: activateSubscription(id)
  Note over Chain: mandate + first charge (sandbox or live)
  SDK-->>App: subscription active, invoice paid
  Note over Hook: subscription.activated, invoice.paid

  loop Each billing period
    Note over SDK: renewal invoice created when due
    SDK->>Chain: chargeInvoice / worker charge
    Chain-->>SDK: success
    Note over Hook: invoice.created, invoice.paid
  end

  App->>SDK: cancelSubscription(id)
  Note over Hook: subscription.canceled
```

## Trial path (`trialDays` greater than 0)

See [Trials](/guide/trials) for the full product contract.

```mermaid
sequenceDiagram
  participant App as Your backend
  participant SDK as AutlanticBilling
  participant Hook as Your webhook URL

  App->>SDK: createSubscription with trialDays
  SDK-->>App: subscription trialing + invoice dueAt trialEnd
  Note over Hook: subscription.created, invoice.created

  App->>SDK: activateSubscription(id)
  Note over SDK: mandate only (no charge while not due)
  SDK-->>App: still trialing
  Note over Hook: subscription.activated

  Note over SDK: Wait until invoice dueAt
  SDK->>SDK: chargeInvoice / worker
  SDK-->>App: invoice paid, subscription active
  Note over Hook: invoice.paid
```

## Subscription state machine

```mermaid
stateDiagram-v2
  [*] --> incomplete: createSubscription trialDays 0
  [*] --> trialing: createSubscription trialDays greater than 0
  incomplete --> active: activateSubscription mandate plus first charge
  trialing --> trialing: activateSubscription mandate only
  trialing --> active: first invoice paid after dueAt
  trialing --> canceled: cancel during trial
  active --> past_due: retries exhausted
  active --> canceled: cancelSubscription
  past_due --> canceled: cancelSubscription
  past_due --> active: successful recovery charge
  canceled --> [*]
```

## Invoice status flow

```mermaid
stateDiagram-v2
  [*] --> open: invoice created
  open --> paid: successful charge
  open --> open: payment_failed (retry scheduled)
  open --> uncollectible: retries exhausted
  open --> void: voidInvoice or cancel in trial
  paid --> refunded: refundInvoice
```

## First charge vs renewals

| Step | API | Charges? |
|------|-----|----------|
| Create (no trial) | `createSubscription` | No. Opens first invoice due now. |
| Create (trial) | `createSubscription` + `trialDays` | No. Opens first invoice with `dueAt` = trial end. Status `trialing`. |
| Activate (no trial) | `activateSubscription` | **Yes.** Completes mandate and pays the first open invoice. |
| Activate (trial, not due) | `activateSubscription` | **No.** Completes mandate only; stays `trialing`. |
| Complete only | `completeSubscription` | No. Mandate only; you charge later. |
| First trial charge / renewal | `chargeInvoice` or Autlantic worker | Yes, when invoice `dueAt` has passed. |

Do **not** call `chargeInvoice` on the same invoice immediately after a successful no-trial `activateSubscription`.

## Webhook timeline (typical)

| Order | Event | Meaning |
|-------|-------|---------|
| 1 | `subscription.created` | Incomplete or `trialing` subscription stored |
| 2 | `invoice.created` | First (or renewal) invoice opened |
| 3 | `subscription.activated` | Mandate active after activate (may still be `trialing`) |
| 4 | `invoice.paid` | Charge succeeded (first paid period or renewal) |
| — | `invoice.payment_failed` | Charge failed; see [retries](/guide/retries) |
| — | `subscription.past_due` | Automatic retries exhausted |
| — | `subscription.updated` | Plan / amount / metadata changes |
| — | `invoice.refunded` / `invoice.voided` | Money returned or invoice canceled |
| — | `subscription.canceled` | Subscription ended (including cancel-in-trial) |

Full verify guide: [Webhooks](/guide/webhooks).

## Related

- [Trials](/guide/trials)
- [Getting started](/guide/getting-started)
- [Error codes](/guide/errors)
- [Retries](/guide/retries)
- [TypeScript types](/api/types)
