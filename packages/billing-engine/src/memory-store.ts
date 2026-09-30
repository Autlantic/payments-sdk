import type {
  RecurringCustomer,
  RecurringInvoice,
  RecurringMandate,
  RecurringSubscription,
} from "@autlantic/payments-recurring-core";
import type { OneTimePayment } from "./one-time";
import type { PaymentLink } from "./payment-links";
import type { BillingStoreSnapshot } from "./types";
import type { BillingStore } from "./types";

export function createMemoryBillingStore(
  initial?: BillingStoreSnapshot,
): BillingStore {
  const subscriptions = new Map<string, RecurringSubscription>();
  const customers = new Map<string, RecurringCustomer>();
  const mandates = new Map<string, RecurringMandate>();
  const invoices = new Map<string, RecurringInvoice>();
  const oneTimePayments = new Map<string, OneTimePayment>();
  const paymentLinks = new Map<string, PaymentLink>();

  if (initial) {
    for (const row of initial.subscriptions) subscriptions.set(row.id, row);
    for (const row of initial.customers) customers.set(row.id, row);
    for (const row of initial.mandates) mandates.set(row.id, row);
    for (const row of initial.invoices) invoices.set(row.id, row);
    for (const row of initial.oneTimePayments ?? []) oneTimePayments.set(row.id, row);
    for (const row of initial.paymentLinks ?? []) paymentLinks.set(row.id, row);
  }

  return {
    saveSubscription(sub) {
      subscriptions.set(sub.id, sub);
    },
    getSubscription(id) {
      return subscriptions.get(id) ?? null;
    },
    listSubscriptionsByMerchant(merchantId) {
      return [...subscriptions.values()].filter((s) => s.merchantId === merchantId);
    },
    listAllSubscriptions() {
      return [...subscriptions.values()];
    },

    saveCustomer(customer) {
      customers.set(customer.id, customer);
    },
    getCustomer(id) {
      return customers.get(id) ?? null;
    },

    saveMandate(mandate) {
      mandates.set(mandate.id, mandate);
    },
    getMandate(id) {
      return mandates.get(id) ?? null;
    },

    saveInvoice(invoice) {
      invoices.set(invoice.id, invoice);
    },
    getInvoice(id) {
      return invoices.get(id) ?? null;
    },
    listOpenInvoicesDueBefore(until) {
      return [...invoices.values()].filter(
        (inv) =>
          inv.status === "open" &&
          inv.dueAt.getTime() <= until.getTime() &&
          (!inv.nextAttemptAt || inv.nextAttemptAt.getTime() <= until.getTime()),
      );
    },
    listInvoicesBySubscription(subscriptionId) {
      return [...invoices.values()].filter((i) => i.subscriptionId === subscriptionId);
    },
    listInvoicesByMerchant(merchantId) {
      return [...invoices.values()].filter((i) => i.merchantId === merchantId);
    },

    saveOneTimePayment(payment) {
      oneTimePayments.set(payment.id, payment);
    },
    getOneTimePayment(id) {
      return oneTimePayments.get(id) ?? null;
    },
    listOneTimePaymentsByMerchant(merchantId) {
      return [...oneTimePayments.values()].filter((p) => p.merchantId === merchantId);
    },

    savePaymentLink(link) {
      paymentLinks.set(link.id, link);
    },
    getPaymentLink(id) {
      return paymentLinks.get(id) ?? null;
    },
    listPaymentLinksByMerchant(merchantId) {
      return [...paymentLinks.values()].filter((l) => l.merchantId === merchantId);
    },
    deletePaymentLink(id) {
      paymentLinks.delete(id);
    },

    snapshot() {
      return {
        subscriptions: [...subscriptions.values()],
        customers: [...customers.values()],
        mandates: [...mandates.values()],
        invoices: [...invoices.values()],
        oneTimePayments: [...oneTimePayments.values()],
        paymentLinks: [...paymentLinks.values()],
      };
    },
  };
}
