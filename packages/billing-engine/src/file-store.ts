import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { createMemoryBillingStore } from "./memory-store";
import { parseBillingSnapshot, serializeBillingSnapshot } from "./serialize";
import type { BillingStore } from "./types";

function persistSnapshot(filePath: string, store: BillingStore): void {
  mkdirSync(dirname(filePath), { recursive: true });
  const tmp = `${filePath}.tmp`;
  const body = JSON.stringify(serializeBillingSnapshot(store.snapshot()), null, 2);
  writeFileSync(tmp, body, "utf8");
  renameSync(tmp, filePath);
}

function loadSnapshot(filePath: string): ReturnType<typeof parseBillingSnapshot> | null {
  try {
    const raw = readFileSync(filePath, "utf8");
    return parseBillingSnapshot(raw);
  } catch {
    return null;
  }
}

/** JSON file store so billing-api and billing-worker share state in dev. */
export function createFileBillingStore(filePath: string): BillingStore {
  const initial = loadSnapshot(filePath);
  const inner = createMemoryBillingStore(initial ?? undefined);

  const persist = () => persistSnapshot(filePath, inner);

  return {
    saveSubscription(sub) {
      inner.saveSubscription(sub);
      persist();
    },
    getSubscription(id) {
      return inner.getSubscription(id);
    },
    listSubscriptionsByMerchant(merchantId) {
      return inner.listSubscriptionsByMerchant(merchantId);
    },
    listAllSubscriptions() {
      return inner.listAllSubscriptions();
    },
    saveCustomer(customer) {
      inner.saveCustomer(customer);
      persist();
    },
    getCustomer(id) {
      return inner.getCustomer(id);
    },
    saveMandate(mandate) {
      inner.saveMandate(mandate);
      persist();
    },
    getMandate(id) {
      return inner.getMandate(id);
    },
    saveInvoice(invoice) {
      inner.saveInvoice(invoice);
      persist();
    },
    getInvoice(id) {
      return inner.getInvoice(id);
    },
    listOpenInvoicesDueBefore(until) {
      return inner.listOpenInvoicesDueBefore(until);
    },
    listInvoicesBySubscription(subscriptionId) {
      return inner.listInvoicesBySubscription(subscriptionId);
    },
    listInvoicesByMerchant(merchantId) {
      return inner.listInvoicesByMerchant(merchantId);
    },
    saveOneTimePayment(payment) {
      inner.saveOneTimePayment(payment);
      persist();
    },
    getOneTimePayment(id) {
      return inner.getOneTimePayment(id);
    },
    listOneTimePaymentsByMerchant(merchantId) {
      return inner.listOneTimePaymentsByMerchant(merchantId);
    },
    savePaymentLink(link) {
      inner.savePaymentLink(link);
      persist();
    },
    getPaymentLink(id) {
      return inner.getPaymentLink(id);
    },
    listPaymentLinksByMerchant(merchantId) {
      return inner.listPaymentLinksByMerchant(merchantId);
    },
    deletePaymentLink(id) {
      inner.deletePaymentLink?.(id);
      persist();
    },
    snapshot() {
      return inner.snapshot();
    },
  };
}
