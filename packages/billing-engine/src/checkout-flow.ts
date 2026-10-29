import type { BillingWebhookEvent, RecurringSubscription, RecurringMandate } from "@autlantic/payments-recurring-core";
import { buildApproveTransaction, buildSubscribeTransaction, chainConfigFor, planRefBytes32 } from "@autlantic/chain-evm";
import { intervalPeriodSeconds } from "@autlantic/payments-recurring-core";
import { attemptInvoiceCharge } from "./charge";
import { completeMandate } from "./subscriptions";
import type { BillingStore, ChargeInvoiceResult, SandboxChargeMode } from "./types";

export type ActivateCheckoutResult = {
  subscription: RecurringSubscription;
  mandate: RecurringMandate;
  charge: ChargeInvoiceResult | null;
  events: BillingWebhookEvent[];
};

/** Complete wallet mandate and charge the first open invoice (initial checkout). */
export function activateSubscriptionCheckout(
  store: BillingStore,
  subscriptionId: string,
  options: { sandbox?: boolean; sandboxMode?: SandboxChargeMode } = {},
): ActivateCheckoutResult | null {
  const completed = completeMandate(store, subscriptionId);
  if (!completed) return null;

  const events: BillingWebhookEvent[] = [...completed.events];

  const openInvoice = store
    .listInvoicesBySubscription(subscriptionId)
    .find((inv) => inv.status === "open");

  if (!openInvoice) {
    return {
      subscription: completed.subscription,
      mandate: completed.mandate,
      charge: null,
      events,
    };
  }

  // Trial: mandate only until first invoice dueAt.
  const dueAtMs = new Date(openInvoice.dueAt).getTime();
  if (Number.isFinite(dueAtMs) && dueAtMs > Date.now() + 1000) {
    return {
      subscription: completed.subscription,
      mandate: completed.mandate,
      charge: null,
      events,
    };
  }

  const charge = attemptInvoiceCharge(store, openInvoice.id, options);
  if (charge) {
    events.push(...charge.events);
  }

  return {
    subscription: charge?.subscription ?? completed.subscription,
    mandate: completed.mandate,
    charge,
    events,
  };
}

export type CheckoutSessionView = {
  subscriptionId: string;
  status: string;
  amountUsdc: number;
  /** Pre-discount list price when a coupon is applied. */
  listAmountUsdc?: number | null;
  interval: string;
  chainId: number;
  network: string;
  usdcAddress: string;
  vaultAddress: string;
  merchantPayout: string;
  customerWallet: string;
  allowanceCapUsdc: number;
  maxChargeUsdc: number;
  approveCalldata: string;
  subscribeCalldata: string;
  planRef: string;
  periodDurationSeconds: number;
  /** ISO timestamp for the next renewal charge (end of current period). */
  nextPaymentAt: string;
  sandbox: boolean;
  merchantDisplayName?: string | null;
  merchantLogoUrl?: string | null;
  merchantWebsiteUrl?: string | null;
  couponCode?: string | null;
  couponLabel?: string | null;
};

export function buildCheckoutSessionView(
  store: BillingStore,
  subscriptionId: string,
  input: {
    vaultAddress: string;
    sandbox: boolean;
    merchantDisplayName?: string | null;
    merchantLogoUrl?: string | null;
    merchantWebsiteUrl?: string | null;
  },
): CheckoutSessionView | null {
  const subscription = store.getSubscription(subscriptionId);
  if (!subscription?.mandateId) return null;

  const mandate = store.getMandate(subscription.mandateId);
  if (!mandate) return null;

  const chain = chainConfigFor(subscription.chainId);
  const approve = buildApproveTransaction({
    chainId: subscription.chainId,
    vaultAddress: input.vaultAddress,
    allowanceCapUsdc: mandate.allowanceCapUsdc,
  });

  const planRef = planRefBytes32(subscription.planId ?? subscription.id);
  const periodDurationSeconds = intervalPeriodSeconds(subscription.interval);
  const subscribe = buildSubscribeTransaction({
    chainId: subscription.chainId,
    vaultAddress: input.vaultAddress,
    planRef,
    merchant: subscription.payoutAddressEvm,
    amountPerPeriodUsdc: subscription.amountUsdc,
    maxChargeUsdc: mandate.maxChargeUsdc,
    periodEndUnix: Math.floor(Date.now() / 1000),
    allowanceCapUsdc: mandate.allowanceCapUsdc,
    periodDurationSeconds,
  });

  const openInvoice = store
    .listInvoicesBySubscription(subscriptionId)
    .find((inv) => inv.status === "open");
  const listFromMeta = subscription.metadata?.listAmountUsdc
    ? Number(subscription.metadata.listAmountUsdc)
    : null;
  const amountUsdc = openInvoice?.amountUsdc ?? subscription.amountUsdc;
  const listAmountUsdc =
    listFromMeta != null && Number.isFinite(listFromMeta) && listFromMeta > amountUsdc
      ? listFromMeta
      : null;

  return {
    subscriptionId: subscription.id,
    status: subscription.status,
    amountUsdc,
    listAmountUsdc,
    interval: subscription.interval,
    chainId: subscription.chainId,
    network: chain.name,
    usdcAddress: chain.usdcAddress,
    vaultAddress: mandate.spenderAddress,
    merchantPayout: subscription.payoutAddressEvm,
    customerWallet: subscription.walletAddress,
    allowanceCapUsdc: mandate.allowanceCapUsdc,
    maxChargeUsdc: mandate.maxChargeUsdc,
    approveCalldata: approve.data,
    subscribeCalldata: subscribe.data,
    planRef,
    periodDurationSeconds,
    nextPaymentAt: subscription.currentPeriodEnd.toISOString(),
    sandbox: input.sandbox,
    merchantDisplayName: input.merchantDisplayName ?? null,
    merchantLogoUrl: input.merchantLogoUrl ?? null,
    merchantWebsiteUrl:
      input.merchantWebsiteUrl ??
      subscription.metadata?.returnUrl ??
      subscription.metadata?.successUrl ??
      null,
    couponCode: subscription.metadata?.couponCode ?? null,
    couponLabel: subscription.metadata?.couponLabel ?? null,
  };
}
