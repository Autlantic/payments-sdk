# TypeScript types

Canonical types live in `@autlantic/payments-recurring-core` and are re-exported from `@autlantic/payments-recurring` where useful. Import from either package; values match the published `.d.ts` files on npm.

```ts
import type {
  BillingInterval,
  BillingWebhookEvent,
  InvoiceFailureCode,
  InvoiceStatus,
  RecurringInvoice,
  RecurringSubscription,
  SubscriptionStatus,
} from "@autlantic/payments-recurring";
```

For the full core surface (mandates, retry policy, all webhook event names):

```ts
import type {
  BillingChainId,
  DefaultRetryPolicy,
  MandateStatus,
  RecurringMandate,
} from "@autlantic/payments-recurring-core";
import { DEFAULT_RETRY_POLICY } from "@autlantic/payments-recurring-core";
```

## Chains and intervals

```ts
type BillingChainId = 8453 | 84532; // Base | Base Sepolia
type BillingNetwork = "base" | "base-sepolia";
type BillingInterval = "month" | "year" | "week" | "five_minute";
```

The merchant SDK `createSubscription` request currently accepts `"month" | "year"` for the common product paths. Core and the engine also support `week` and `five_minute` (useful for sandbox renewals).

## Status enums

```ts
type SubscriptionStatus = "incomplete" | "trialing" | "active" | "past_due" | "canceled";
type MandateStatus = "pending" | "active" | "revoked" | "expired";
type InvoiceStatus = "open" | "paid" | "void" | "uncollectible" | "refunded";
```

| Status | Meaning |
|--------|---------|
| `incomplete` | Created; mandate / first charge not finished |
| `active` | Mandate live; renewals expected |
| `past_due` | Retries exhausted (see [Retries](/guide/retries)) |
| `canceled` | Canceled at period end or immediately |

## Core domain objects

```ts
type RecurringSubscription = {
  id: string;
  merchantId: string;
  merchantRef: string;
  customerId: string;
  planId?: string;
  payoutAddressEvm: string;
  walletAddress: string;
  amountUsdc: number;
  interval: BillingInterval;
  chainId: BillingChainId;
  status: SubscriptionStatus;
  mandateId?: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  canceledAt?: Date;
  metadata?: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
};

type RecurringInvoice = {
  id: string;
  subscriptionId: string;
  merchantId: string;
  status: InvoiceStatus;
  amountUsdc: number;
  dueAt: Date;
  attemptCount: number;
  nextAttemptAt?: Date;
  paidAt?: Date;
  txHash?: string;
  refundedAt?: Date;
  refundTxHash?: string;
  refundAmountUsdc?: number;
  failureCode?: InvoiceFailureCode;
  failureMessage?: string;
  createdAt: Date;
  updatedAt: Date;
};

type RecurringMandate = {
  id: string;
  subscriptionId: string;
  walletAddress: string;
  spenderAddress: string;
  chainId: BillingChainId;
  allowanceCapUsdc: number;
  maxChargeUsdc: number;
  status: MandateStatus;
  createdAt: Date;
  activatedAt?: Date;
};
```

## SDK request / config types

From `@autlantic/payments-recurring`:

```ts
type AutlanticBillingConfig = {
  apiBaseUrl?: string;
  apiKey?: string;
  merchantId: string;
  sandbox?: boolean;
  webhookSecret?: string;
};

type CreateSubscriptionRequest = {
  merchantRef: string;
  customerWallet: string;
  payoutAddressEvm: string;
  amountUsdc?: number;
  interval?: "month" | "year";
  /** Hosted: prefer catalog price.trialDays. Sandbox SDK may pass explicitly. */
  trialDays?: number;
  priceId?: string;
  planId?: string;
  metadata?: Record<string, string>;
};

type CreatePaymentRequest = {
  merchantRef: string;
  customerWallet: string;
  payoutAddressEvm: string;
  amountUsdc?: number;
  priceId?: string; // catalog interval "once"
  metadata?: Record<string, string>;
};

type OneTimePaymentStatus = "open" | "paid" | "canceled";

type OneTimePayment = {
  id: string;
  merchantId: string;
  merchantRef: string;
  customerWallet: string;
  payoutAddressEvm: string;
  amountUsdc: number;
  status: OneTimePaymentStatus;
  priceId?: string;
  productName?: string;
  chainId: BillingChainId;
  metadata?: Record<string, string>;
  createdAt: Date;
  paidAt?: Date;
  txHash?: string;
  canceledAt?: Date;
};
```

Catalog prices from `listProducts()` use `interval: "month" | "year" | "once"`.

## Webhook payload shape

```ts
type BillingWebhookEventType =
  | "subscription.created"
  | "subscription.activated"
  | "subscription.updated"
  | "subscription.past_due"
  | "subscription.canceled"
  | "invoice.created"
  | "invoice.paid"
  | "invoice.payment_failed"
  | "invoice.refunded"
  | "invoice.voided"
  | "payment.created"
  | "payment.paid";

type BillingWebhookEvent = {
  type: BillingWebhookEventType;
  id: string;
  createdAt: string; // ISO 8601
  data: Record<string, unknown>;
};
```

See [Webhooks](/guide/webhooks) and [Lifecycle](/guide/lifecycle).

## Failure and retry types

```ts
type InvoiceFailureCode =
  | "INSUFFICIENT_BALANCE"
  | "ALLOWANCE_REVOKED"
  | "ALLOWANCE_TOO_LOW"
  | "MANDATE_INACTIVE"
  | "RELAYER_ERROR"
  | "SANDBOX_DECLINED";

type DefaultRetryPolicy = {
  maxAttempts: number;
  retryDelaysDays: number[];
};
```

Full tables: [Error codes](/guide/errors), [Retries](/guide/retries).

## Source of truth

- Types: [`packages/payments-recurring-core/src/types.ts`](https://github.com/autlantic/payments-sdk/blob/main/packages/payments-recurring-core/src/types.ts)
- SDK config: [`packages/payments-recurring/src/config.ts`](https://github.com/autlantic/payments-sdk/blob/main/packages/payments-recurring/src/config.ts)
- npm: install `@autlantic/payments-recurring` and inspect `node_modules/@autlantic/*/dist/*.d.ts`
