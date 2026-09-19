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

export function activateSubscriptionLive(
  store: BillingStore,
  subscriptionId: string,
  onChainSubscriptionId: string,
  txHash?: string,
): ActivateLiveResult | null {
  const linked = setOnChainSubscriptionId(store, subscriptionId, onChainSubscriptionId);
  if (!linked) return null;

  const openInvoice = store
    .listInvoicesBySubscription(subscriptionId)
    .find((inv) => inv.status === "open");
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

  const mandateResult = completeMandate(store, subscriptionId);
  if (!mandateResult) return null;

  const events: BillingWebhookEvent[] = [...mandateResult.events];

  if (!openInvoice) {
    return {
      subscription: mandateResult.subscription,
      mandate: mandateResult.mandate,
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
      subscription: charge?.subscription ?? mandateResult.subscription,
      mandate: mandateResult.mandate,
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
    mandate: mandateResult.mandate,
    charge,
    events,
  };
}
