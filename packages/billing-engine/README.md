# @autlantic/billing-engine

Subscription, invoice, and payment-link engine for Autlantic USDC billing on Base.

Also exports workspace-band helpers, plan-change proration (`previewPlanChangeProration` / `changeSubscriptionPlan`), and usage metering (`createUsageRecord` / `aggregateUsageIntoInvoice`). See the [changelog](https://docs.autlantic.com/resources/changelog) for **0.3.14**.

Usually consumed via `@autlantic/payments-recurring`. Charges settle to the merchant payout wallet; Autlantic does not custody subscription revenue.

Webhook HTTP delivery to merchants is owned by the hosted billing API via **portal webhook endpoints** (URL + signing secret per Test/Live). This package provides `deliverBillingWebhooks(url, events, sign)` for that path; it does not read a global `AUTLANTIC_BILLING_WEBHOOK_URL`.

Docs: https://docs.autlantic.com · Non-custodial: https://autlantic.com/non-custodial
