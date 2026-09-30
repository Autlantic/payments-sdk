import type {
  BillingWebhookEvent,
  RecurringCustomer,
  RecurringInvoice,
  RecurringMandate,
  RecurringSubscription,
} from "@autlantic/payments-recurring-core";
import type { OneTimePayment } from "./one-time";
import type { PaymentLink } from "./payment-links";

export type BillingStoreSnapshot = {
  subscriptions: RecurringSubscription[];
  customers: RecurringCustomer[];
  mandates: RecurringMandate[];
  invoices: RecurringInvoice[];
  oneTimePayments?: OneTimePayment[];
  paymentLinks?: PaymentLink[];
};

export type BillingStore = {
  saveSubscription(sub: RecurringSubscription): void;
  getSubscription(id: string): RecurringSubscription | null;
  listSubscriptionsByMerchant(merchantId: string): RecurringSubscription[];
  listAllSubscriptions(): RecurringSubscription[];

  saveCustomer(customer: RecurringCustomer): void;
  getCustomer(id: string): RecurringCustomer | null;

  saveMandate(mandate: RecurringMandate): void;
  getMandate(id: string): RecurringMandate | null;

  saveInvoice(invoice: RecurringInvoice): void;
  getInvoice(id: string): RecurringInvoice | null;
  listOpenInvoicesDueBefore(until: Date): RecurringInvoice[];
  listInvoicesBySubscription(subscriptionId: string): RecurringInvoice[];
  listInvoicesByMerchant(merchantId: string): RecurringInvoice[];

  saveOneTimePayment(payment: OneTimePayment): void;
  getOneTimePayment(id: string): OneTimePayment | null;
  listOneTimePaymentsByMerchant(merchantId: string): OneTimePayment[];

  savePaymentLink(link: PaymentLink): void;
  getPaymentLink(id: string): PaymentLink | null;
  listPaymentLinksByMerchant(merchantId: string): PaymentLink[];
  /** Optional; portal/API hard-delete. Missing stores fall back to disable. */
  deletePaymentLink?(id: string): void;

  snapshot(): BillingStoreSnapshot;
};

/** When present on write-through stores, awaits queued Prisma/file persists. */
export type BillingStoreWithPersistFlush = BillingStore & {
  flushPersist(): Promise<void>;
};

export function isBillingStoreWithPersistFlush(
  store: BillingStore,
): store is BillingStoreWithPersistFlush {
  return typeof (store as BillingStoreWithPersistFlush).flushPersist === "function";
}

export async function flushBillingStorePersist(store: BillingStore): Promise<void> {
  if (isBillingStoreWithPersistFlush(store)) {
    await store.flushPersist();
  }
}

export type CreateSubscriptionResult = {
  subscription: RecurringSubscription;
  invoice: RecurringInvoice;
  mandate: RecurringMandate;
  events: BillingWebhookEvent[];
};

export type CompleteMandateResult = {
  subscription: RecurringSubscription;
  mandate: RecurringMandate;
  events: BillingWebhookEvent[];
};

export type ChargeInvoiceResult = {
  invoice: RecurringInvoice;
  subscription: RecurringSubscription;
  events: BillingWebhookEvent[];
  ok: boolean;
};

export type CancelSubscriptionResult = {
  subscription: RecurringSubscription;
  events: BillingWebhookEvent[];
};

export type SandboxChargeMode = "success" | "insufficient_balance" | "allowance_revoked";
