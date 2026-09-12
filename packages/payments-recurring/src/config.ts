import type { BillingLogLevel, BillingLogger } from "./logger";

export type AutlanticBillingConfig = {
  /** REST API base URL (no trailing slash). Omit for in-process sandbox. */
  apiBaseUrl?: string;
  apiKey?: string;
  merchantId: string;
  sandbox?: boolean;
  webhookSecret?: string;
  /**
   * Opt-in HTTP + SDK diagnostics (method, path, status, latency).
   * Secrets are redacted. Also enabled via `AUTLANTIC_BILLING_DEBUG=1`.
   */
  debug?: boolean;
  /** Minimum level when using the built-in console logger. */
  logLevel?: BillingLogLevel;
  /** Inject Datadog / Pino / custom sink. Overrides the built-in console logger. */
  logger?: BillingLogger;
};

export type BillingCatalogPriceInterval =
  | "month"
  | "year"
  | "once"
  | "week"
  | "five_minute";

export type BillingCatalogPrice = {
  id: string;
  productId: string;
  amountUsdc: number;
  interval: BillingCatalogPriceInterval;
  trialDays: number;
  active: boolean;
};

export type BillingCatalogProduct = {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  metadata: Record<string, string> | null;
  prices: BillingCatalogPrice[];
};

export type CreateCatalogProductRequest = {
  name: string;
  description?: string;
  active?: boolean;
  metadata?: Record<string, string>;
  price?: {
    amountUsdc: number;
    interval: BillingCatalogPriceInterval;
    trialDays?: number;
    active?: boolean;
  };
};

export type UpdateCatalogProductRequest = {
  name?: string;
  description?: string | null;
  active?: boolean;
  metadata?: Record<string, string> | null;
};

export type CreateCatalogPriceRequest = {
  amountUsdc: number;
  interval: BillingCatalogPriceInterval;
  trialDays?: number;
  active?: boolean;
};

export type UpdateCatalogPriceRequest = {
  active?: boolean;
  amountUsdc?: number;
  interval?: BillingCatalogPriceInterval;
  trialDays?: number;
};

export type BillingCoupon = {
  id: string;
  code: string;
  percentOff: number | null;
  amountOffUsdc: number | null;
  duration: "once" | "forever";
  active: boolean;
  maxRedemptions: number | null;
  redemptionCount: number;
  /** Empty = merchant-wide; otherwise e.g. platform creatorId. */
  scopeKey: string;
  expiresAt: string | null;
  metadata: Record<string, string> | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateBillingCouponRequest = {
  code: string;
  percentOff?: number | null;
  amountOffUsdc?: number | null;
  duration?: "once" | "forever";
  maxRedemptions?: number | null;
  scopeKey?: string | null;
  expiresAt?: string | null;
  metadata?: Record<string, string> | null;
  active?: boolean;
};

export type UpdateBillingCouponRequest = {
  code?: string;
  percentOff?: number | null;
  amountOffUsdc?: number | null;
  duration?: "once" | "forever";
  maxRedemptions?: number | null;
  scopeKey?: string | null;
  expiresAt?: string | null;
  metadata?: Record<string, string> | null;
  active?: boolean;
};

/**
 * Create a subscription.
 * Provide either `priceId` (hosted catalog) or `amountUsdc` + `interval` (ad-hoc / sandbox).
 */
export type CreateSubscriptionRequest = {
  merchantRef: string;
  customerWallet: string;
  payoutAddressEvm: string;
  amountUsdc?: number;
  interval?: "month" | "year";
  /** Portal catalog price id. Resolves amount + interval on the API. */
  priceId?: string;
  planId?: string;
  /** App deep link or https return after successful checkout. */
  successUrl?: string;
  /** App deep link or https return if the customer cancels. */
  cancelUrl?: string;
  metadata?: Record<string, string>;
};

/**
 * Create a one-time USDC payment.
 * Provide either `priceId` (catalog interval "once") or `amountUsdc`.
 */
export type CreatePaymentRequest = {
  merchantRef: string;
  customerWallet: string;
  payoutAddressEvm: string;
  amountUsdc?: number;
  /** Portal catalog price id with interval "once". */
  priceId?: string;
  /** App deep link or https return after successful checkout. */
  successUrl?: string;
  /** App deep link or https return if the customer cancels. */
  cancelUrl?: string;
  metadata?: Record<string, string>;
};

/**
 * Create a shareable payment link (URL / QR).
 * Provide either `priceId` (catalog interval "once") or `amountUsdc`.
 * Payer wallet is collected when the link is opened.
 */
export type CreatePaymentLinkRequest = {
  /** Used as merchantRef prefix when minting payments (`prefix_1`, `prefix_2`, …). */
  merchantRefPrefix?: string;
  payoutAddressEvm: string;
  amountUsdc?: number;
  priceId?: string;
  description?: string;
  /** null / omit = unlimited opens */
  maxUses?: number | null;
  /** ISO date string when the link stops accepting opens */
  expiresAt?: string | null;
  /** App deep link or https return after successful pay. */
  successUrl?: string;
  /** App deep link or https return if the customer cancels. */
  cancelUrl?: string;
  collectEmail?: boolean;
  collectName?: boolean;
  metadata?: Record<string, string>;
};
