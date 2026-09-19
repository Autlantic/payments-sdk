import type { BillingWebhookEvent, RecurringMandate, RecurringSubscription } from "@autlantic/payments-recurring-core";
import {
  findInvoiceByTxHash,
  isValidLiveChargeTxHash,
  setOnChainSubscriptionId,
} from "./on-chain";
import { attemptInvoiceCharge } from "./charge";
import type { ChargeInvoiceResult } from "./types";
import { completeMandate } from "./subscriptions";
import type { BillingStore } from "./types";

export type ActivateLiveResult = {
  subscription: RecurringSubscription;
  mandate: RecurringMandate;
  charge: ChargeInvoiceResult | null;
  events: BillingWebhookEvent[];
};

/**
 * Finalize a live checkout after an on-chain charge.
 * Idempotent: safe to retry when the mandate is already active or the invoice
 * was already paid (partial activate / multi-instance write-through races).
 */
export function activateSubscriptionLive(
  store: BillingStore,
  subscriptionId: string,
  onChainSubscriptionId: string,
  txHash?: string,
): ActivateLiveResult | null {
  const linked = setOnChainSubscriptionId(store, subscriptionId, onChainSubscriptionId);
  if (!linked) return null;

  const subscription = store.getSubscription(subscriptionId);
  if (!subscription?.mandateId) return null;

  const mandate = store.getMandate(subscription.mandateId);
  if (!mandate) return null;

  const invoices = store.listInvoicesBySubscription(subscriptionId);
  const paidInvoice =
    invoices
      .filter((inv) => inv.status === "paid")
      .sort(
        (a, b) =>
          +new Date(b.paidAt ?? b.createdAt) - +new Date(a.paidAt ?? a.createdAt),
      )[0] ?? null;

  // Already finalized (retry / other instance wrote paid+active).
  if (paidInvoice && (subscription.status === "active" || subscription.status === "incomplete")) {
    let activeSub = subscription;
    if (subscription.status === "incomplete") {
      activeSub = {
        ...subscription,
        status: "active",
        updatedAt: new Date(),
      };
      store.saveSubscription(activeSub);
    }
    const activeMandate =
      mandate.status === "active"
        ? mandate
        : (() => {
            const now = new Date();
            const updated: RecurringMandate = {
              ...mandate,
              status: "active",
              activatedAt: mandate.activatedAt ?? now,
            };
            store.saveMandate(updated);
            return updated;
          })();
    return {
      subscription: activeSub,
      mandate: activeMandate,
      charge: { ok: true, invoice: paidInvoice, subscription: activeSub, events: [] },
      events: [],
    };
  }

  const openInvoice = invoices.find((inv) => inv.status === "open");
  const requiresPaidCharge = Boolean(openInvoice && openInvoice.amountUsdc > 0);

  const normalizedTx = txHash?.trim();
  const canFinalizeInvoice =
    Boolean(openInvoice) &&
    isValidLiveChargeTxHash(normalizedTx) &&
    !findInvoiceByTxHash(store, normalizedTx!, openInvoice!.id);

  // Never mark a paid live subscription active without a finalized on-chain charge.
  if (requiresPaidCharge && !canFinalizeInvoice) {
    return null;
  }

  const events: BillingWebhookEvent[] = [];
  let activeMandate = mandate;
  let mandateSub = subscription;

  if (mandate.status === "pending") {
    const mandateResult = completeMandate(store, subscriptionId);
    if (!mandateResult) return null;
    activeMandate = mandateResult.mandate;
    mandateSub = mandateResult.subscription;
    events.push(...mandateResult.events);
  } else if (mandate.status !== "active") {
    return null;
  }

  if (!openInvoice) {
    // Mandate active, no open invoice: promote incomplete → active when nothing is owed.
    if (mandateSub.status === "incomplete") {
      const now = new Date();
      const activated: RecurringSubscription = {
        ...mandateSub,
        status: "active",
        updatedAt: now,
      };
      store.saveSubscription(activated);
      return {
        subscription: activated,
        mandate: activeMandate,
        charge: null,
        events,
      };
    }
    return {
      subscription: mandateSub,
      mandate: activeMandate,
      charge: null,
      events,
    };
  }

  if (openInvoice.amountUsdc <= 0) {
    const charge = attemptInvoiceCharge(store, openInvoice.id, {
      sandbox: false,
      txHash: normalizedTx && isValidLiveChargeTxHash(normalizedTx) ? normalizedTx : undefined,
    });
    if (charge) events.push(...charge.events);
    return {
      subscription: charge?.subscription ?? mandateSub,
      mandate: activeMandate,
      charge,
      events,
    };
  }

  const charge = attemptInvoiceCharge(store, openInvoice.id, {
    sandbox: false,
    txHash: normalizedTx,
  });
  if (!charge?.ok) {
    return null;
  }
  events.push(...charge.events);

  return {
    subscription: charge.subscription,
    mandate: activeMandate,
    charge,
    events,
  };
}
