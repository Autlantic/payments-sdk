import { createMemoryBillingStore } from "./memory-store";
import type {
  BillingStore,
  BillingStoreSnapshot,
  BillingStoreWithPersistFlush,
} from "./types";
import type { OneTimePayment } from "./one-time";
import type { PaymentLink } from "./payment-links";
import type {
  RecurringCustomer,
  RecurringInvoice,
  RecurringMandate,
  RecurringSubscription,
} from "@autlantic/payments-recurring-core";

export type BillingPersistAdapter = {
  saveSubscription(sub: RecurringSubscription): Promise<void>;
  saveCustomer(customer: RecurringCustomer): Promise<void>;
  saveMandate(mandate: RecurringMandate): Promise<void>;
  saveInvoice(invoice: RecurringInvoice): Promise<void>;
  saveOneTimePayment(payment: OneTimePayment): Promise<void>;
  savePaymentLink(link: PaymentLink): Promise<void>;
  deletePaymentLink?(id: string): Promise<void>;
  /** Optional: load a single link when another process created it (portal ↔ API). */
  loadPaymentLink?(id: string): Promise<PaymentLink | null>;
  loadSnapshot(): Promise<BillingStoreSnapshot>;
};

export function hydrateBillingStore(
  store: BillingStore,
  snapshot: BillingStoreSnapshot,
): void {
  for (const sub of snapshot.subscriptions) store.saveSubscription(sub);
  for (const customer of snapshot.customers) store.saveCustomer(customer);
  for (const mandate of snapshot.mandates) store.saveMandate(mandate);
  for (const invoice of snapshot.invoices) store.saveInvoice(invoice);
  for (const payment of snapshot.oneTimePayments ?? []) store.saveOneTimePayment(payment);
  for (const link of snapshot.paymentLinks ?? []) store.savePaymentLink(link);
}

export function createWriteThroughBillingStore(
  memory: BillingStore,
  persist: BillingPersistAdapter,
  options?: {
    /** Called when a queued persist fails. Default: silent (no console). */
    onPersistError?: (label: string, err: unknown) => void;
  },
): BillingStoreWithPersistFlush {
  let persistQueue = Promise.resolve();

  const persistQueued = (label: string, fn: () => Promise<void>) => {
    persistQueue = persistQueue
      .then(fn)
      .catch((err) => {
        options?.onPersistError?.(label, err);
      });
  };

  return {
    saveSubscription(sub) {
      memory.saveSubscription(sub);
      persistQueued("subscription", () => persist.saveSubscription(sub));
    },
    getSubscription(id) {
      return memory.getSubscription(id);
    },
    listSubscriptionsByMerchant(merchantId) {
      return memory.listSubscriptionsByMerchant(merchantId);
    },
    listAllSubscriptions() {
      return memory.listAllSubscriptions();
    },
    saveCustomer(customer) {
      memory.saveCustomer(customer);
      persistQueued("customer", () => persist.saveCustomer(customer));
    },
    getCustomer(id) {
      return memory.getCustomer(id);
    },
    saveMandate(mandate) {
      memory.saveMandate(mandate);
      persistQueued("mandate", () => persist.saveMandate(mandate));
    },
    getMandate(id) {
      return memory.getMandate(id);
    },
    saveInvoice(invoice) {
      memory.saveInvoice(invoice);
      persistQueued("invoice", () => persist.saveInvoice(invoice));
    },
    getInvoice(id) {
      return memory.getInvoice(id);
    },
    listOpenInvoicesDueBefore(until) {
      return memory.listOpenInvoicesDueBefore(until);
    },
    listInvoicesBySubscription(subscriptionId) {
      return memory.listInvoicesBySubscription(subscriptionId);
    },
    listInvoicesByMerchant(merchantId) {
      return memory.listInvoicesByMerchant(merchantId);
    },
    saveOneTimePayment(payment) {
      memory.saveOneTimePayment(payment);
      persistQueued("oneTimePayment", () => persist.saveOneTimePayment(payment));
    },
    getOneTimePayment(id) {
      return memory.getOneTimePayment(id);
    },
    listOneTimePaymentsByMerchant(merchantId) {
      return memory.listOneTimePaymentsByMerchant(merchantId);
    },
    savePaymentLink(link) {
      memory.savePaymentLink(link);
      persistQueued("paymentLink", () => persist.savePaymentLink(link));
    },
    getPaymentLink(id) {
      return memory.getPaymentLink(id);
    },
    listPaymentLinksByMerchant(merchantId) {
      return memory.listPaymentLinksByMerchant(merchantId);
    },
    deletePaymentLink(id) {
      memory.deletePaymentLink?.(id);
      if (persist.deletePaymentLink) {
        persistQueued("paymentLinkDelete", () => persist.deletePaymentLink!(id));
      }
    },
    replaceSnapshot(snapshot) {
      // Memory only. Never queue upserts — reload must not resurrect deleted rows.
      if (typeof memory.replaceSnapshot === "function") {
        memory.replaceSnapshot(snapshot);
        return;
      }
      // Legacy memory stores: best-effort hydrate without clear.
      hydrateBillingStore(memory, snapshot);
    },
    snapshot() {
      return memory.snapshot();
    },
    async flushPersist() {
      await persistQueue;
    },
  };
}

export async function createPersistedBillingStore(
  persist: BillingPersistAdapter,
): Promise<BillingStore> {
  const snapshot = await persist.loadSnapshot();
  const memory = createMemoryBillingStore(snapshot);
  return createWriteThroughBillingStore(memory, persist);
}

export async function reloadPersistedBillingStore(
  store: BillingStore,
  persist: BillingPersistAdapter,
): Promise<void> {
  const snapshot = await persist.loadSnapshot();
  if (typeof store.replaceSnapshot === "function") {
    store.replaceSnapshot(snapshot);
    return;
  }
  // Legacy path: hydrate may write through. Prefer replaceSnapshot on new stores.
  const fresh = createMemoryBillingStore();
  hydrateBillingStore(fresh, snapshot);
  hydrateBillingStore(store, fresh.snapshot());
}
