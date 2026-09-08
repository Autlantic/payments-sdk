export {
  AutlanticBilling,
  AUTLANTIC_BILLING_SDK_VERSION,
  AUTLANTIC_API_VERSION,
  billingModeFromApiKey,
  sandboxFromApiKeyAndEnv,
} from "./client";
export type {
  AutlanticBillingConfig,
  BillingCatalogPrice,
  BillingCatalogProduct,
  CreatePaymentLinkRequest,
  CreatePaymentRequest,
  CreateSubscriptionRequest,
} from "./config";
export {
  AutlanticBillingError,
  type AutlanticBillingErrorCode,
  type AutlanticBillingErrorParams,
  type AutlanticBillingErrorType,
} from "./errors";
export {
  createConsoleBillingLogger,
  isBillingDebugEnv,
  noopBillingLogger,
  parseBillingLogLevel,
  redactForLog,
  redactHeadersForLog,
  redactSecret,
  resolveBillingLogger,
  type BillingLogLevel,
  type BillingLogMeta,
  type BillingLogger,
  type CreateConsoleLoggerOptions,
} from "./logger";
export {
  assertBillingWebhook,
  signBillingWebhook,
  signBillingWebhookBody,
  verifyBillingWebhook,
  verifyBillingWebhookDetailed,
  BILLING_WEBHOOK_TOLERANCE_SEC,
  parseBillingWebhookEvent,
  parseBillingWebhookEventDetailed,
  BILLING_WEBHOOK_SIGNATURE_HEADER,
  type WebhookParseFailureReason,
  type WebhookParseResult,
  type WebhookVerifyFailureReason,
  type WebhookVerifyResult,
} from "./webhook";

export type {
  BillingInterval,
  BillingWebhookEvent,
  RecurringInvoice,
  RecurringSubscription,
  SubscriptionStatus,
} from "@autlantic/payments-recurring-core";

export type {
  OneTimePayment,
  OneTimePaymentStatus,
  CreateOneTimePaymentResult,
  PaymentLink,
  PaymentLinkStatus,
} from "@autlantic/billing-engine";

export {
  defaultSandboxChainId,
  chainConfigFor,
  usdcToMicro,
  encodeApproveCalldata,
} from "@autlantic/chain-evm";
