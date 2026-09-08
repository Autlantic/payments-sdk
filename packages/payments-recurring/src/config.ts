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

export type BillingCatalogPrice = {
  id: string;
  productId: string;
  amountUsdc: number;
  interval: "month" | "year" | "once";
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
