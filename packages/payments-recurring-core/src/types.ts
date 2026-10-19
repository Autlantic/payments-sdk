export type BillingChainId = 8453 | 84532;

export type BillingNetwork = "base" | "base-sepolia";

export type BillingInterval = "month" | "year" | "week" | "five_minute";

export type SubscriptionStatus =
  | "incomplete"
  | "active"
  | "past_due"
  | "canceled";

export type MandateStatus = "pending" | "active" | "revoked" | "expired";

export type InvoiceStatus = "open" | "paid" | "void" | "uncollectible" | "refunded";

export type BillingWebhookEventType =
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

export type RecurringMerchant = {
  id: string;
  payoutAddressEvm: string;
  webhookUrl?: string;
  webhookSecret?: string;
};

export type RecurringCustomer = {
  id: string;
  merchantId: string;
  walletAddress: string;
  /** test | live — matches the API key that created this customer */
  mode?: "test" | "live";
};

export type RecurringMandate = {
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

export type RecurringSubscription = {
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
  /** test | live — matches the API key that created this subscription */
  mode?: "test" | "live";
  createdAt: Date;
  updatedAt: Date;
};

export type RecurringInvoice = {
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
  /** test | live — matches the subscription / API key */
  mode?: "test" | "live";
  createdAt: Date;
  updatedAt: Date;
};

export type InvoiceFailureCode =
  | "INSUFFICIENT_BALANCE"
  | "ALLOWANCE_REVOKED"
  | "ALLOWANCE_TOO_LOW"
  | "MANDATE_INACTIVE"
  /** Off-chain due clock is ahead of vault periodEnd. Defer quietly; not a customer failure. */
  | "CHARGE_NOT_DUE"
  | "RELAYER_ERROR"
  | "SANDBOX_DECLINED";

export type CreateSubscriptionInput = {
  merchantId: string;
  merchantRef: string;
  walletAddress: string;
  payoutAddressEvm: string;
  amountUsdc: number;
  interval: BillingInterval;
  chainId: BillingChainId;
  planId?: string;
  metadata?: Record<string, string>;
  /** Rolling allowance cap in USDC (default: 3x amount). */
  allowanceCapUsdc?: number;
  /** Max single charge in USDC (default: amountUsdc). */
  maxChargeUsdc?: number;
  vaultAddress: string;
  /** test | live — stamped from the authenticating API key */
  mode?: "test" | "live";
};

export type BillingWebhookEvent<T extends BillingWebhookEventType = BillingWebhookEventType> = {
  type: T;
  id: string;
  createdAt: string;
  data: Record<string, unknown>;
};

export type DefaultRetryPolicy = {
  maxAttempts: number;
  /** Days after previous attempt for retries 2..n (index 0 unused). */
  retryDelaysDays: number[];
};

export const DEFAULT_RETRY_POLICY: DefaultRetryPolicy = {
  maxAttempts: 4,
  retryDelaysDays: [0, 1, 2, 4],
};
