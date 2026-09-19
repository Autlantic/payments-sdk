import type { RecurringInvoice, RecurringSubscription } from "@autlantic/payments-recurring-core";
import type { BillingStore } from "./types";

export const ON_CHAIN_SUBSCRIPTION_ID_KEY = "onChainSubscriptionId";

const PLACEHOLDER_TX_HASHES = new Set(["0x0", "0x00"]);

export function isValidLiveChargeTxHash(txHash: string | null | undefined): boolean {
  const normalized = txHash?.trim();
  if (!normalized?.startsWith("0x")) return false;
  if (normalized.length < 66) return false;
  if (PLACEHOLDER_TX_HASHES.has(normalized.toLowerCase())) return false;
  return true;
}

export function findSubscriptionByOnChainId(
  store: BillingStore,
  onChainSubscriptionId: string,
  excludeSubscriptionId?: string,
): RecurringSubscription | null {
  const digits = String(onChainSubscriptionId).replace(/\D/g, "");
  if (!digits || digits === "0") return null;

  for (const subscription of store.listAllSubscriptions()) {
    if (excludeSubscriptionId && subscription.id === excludeSubscriptionId) continue;
    if (subscription.status === "canceled") continue;
    if (getOnChainSubscriptionId(subscription) === digits) return subscription;
  }

  return null;
}

export function findInvoiceByTxHash(
  store: BillingStore,
  txHash: string,
  excludeInvoiceId?: string,
): RecurringInvoice | null {
  const normalized = txHash.trim().toLowerCase();
  if (!normalized.startsWith("0x")) return null;

  for (const subscription of store.listAllSubscriptions()) {
    for (const invoice of store.listInvoicesBySubscription(subscription.id)) {
      if (excludeInvoiceId && invoice.id === excludeInvoiceId) continue;
      if (invoice.txHash?.trim().toLowerCase() === normalized) return invoice;
    }
  }

  return null;
}

export function getOnChainSubscriptionId(subscription: RecurringSubscription): string | null {
  const raw = subscription.metadata?.[ON_CHAIN_SUBSCRIPTION_ID_KEY]?.trim();
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  return digits && digits !== "0" ? digits : null;
}

export function setOnChainSubscriptionId(
  store: BillingStore,
  subscriptionId: string,
  onChainSubscriptionId: string,
): RecurringSubscription | null {
  const subscription = store.getSubscription(subscriptionId);
  if (!subscription) return null;

  const digits = String(onChainSubscriptionId).replace(/\D/g, "");
  if (!digits || digits === "0") return null;

  const now = new Date();
  const updated: RecurringSubscription = {
    ...subscription,
    metadata: {
      ...subscription.metadata,
      [ON_CHAIN_SUBSCRIPTION_ID_KEY]: digits,
    },
    updatedAt: now,
  };

  store.saveSubscription(updated);
  return updated;
}
