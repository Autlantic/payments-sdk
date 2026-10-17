import {
  createWebhookEvent,
  assertPositiveAmountUsdc,
  normalizeEvmAddress,
  type BillingChainId,
  type BillingWebhookEvent,
} from "@autlantic/payments-recurring-core";
import {
  chainConfigFor,
  encodeTransferCalldata,
  usdcToMicro,
} from "@autlantic/chain-evm";
import { newId } from "./id";
import type { BillingStore } from "./types";

export type OneTimePaymentStatus = "open" | "paid" | "canceled";

export type OneTimePayment = {
  id: string;
  merchantId: string;
  merchantRef: string;
  customerWallet: string;
  payoutAddressEvm: string;
  amountUsdc: number;
  status: OneTimePaymentStatus;
  priceId?: string;
  productName?: string;
  chainId: BillingChainId;
  metadata?: Record<string, string>;
  /** test | live — matches the API key that created this payment */
  mode?: "test" | "live";
  createdAt: Date;
  paidAt?: Date;
  txHash?: string;
  canceledAt?: Date;
};

export type CreateOneTimePaymentInput = {
  merchantId: string;
  merchantRef: string;
  customerWallet: string;
  payoutAddressEvm: string;
  amountUsdc: number;
  chainId: BillingChainId;
  priceId?: string;
  productName?: string;
  metadata?: Record<string, string>;
  /** test | live — stamped from the authenticating API key */
  mode?: "test" | "live";
};

export type CreateOneTimePaymentResult = {
  payment: OneTimePayment;
  events: BillingWebhookEvent[];
};

export type ConfirmOneTimePaymentResult = {
  payment: OneTimePayment;
  events: BillingWebhookEvent[];
  alreadyPaid: boolean;
};

export type OneTimeCheckoutSessionView = {
  paymentId: string;
  status: OneTimePaymentStatus;
  amountUsdc: number;
  /** Pre-discount list price when a coupon is applied. */
  listAmountUsdc?: number | null;
  interval: "once";
  chainId: number;
  network: string;
  usdcAddress: string;
  merchantPayout: string;
  customerWallet: string;
  transferCalldata: string;
  productName?: string | null;
  sandbox: boolean;
  merchantDisplayName?: string | null;
  merchantLogoUrl?: string | null;
  merchantWebsiteUrl?: string | null;
  couponCode?: string | null;
  couponLabel?: string | null;
};

export function createOneTimePayment(
  store: BillingStore,
  input: CreateOneTimePaymentInput,
): CreateOneTimePaymentResult {
  assertPositiveAmountUsdc(input.amountUsdc);
  const customerWallet = normalizeEvmAddress(input.customerWallet);
  const payoutAddressEvm = normalizeEvmAddress(input.payoutAddressEvm);
  const now = new Date();

  const payment: OneTimePayment = {
    id: newId("pay"),
    merchantId: input.merchantId,
    merchantRef: input.merchantRef,
    customerWallet,
    payoutAddressEvm,
    amountUsdc: input.amountUsdc,
    status: "open",
    priceId: input.priceId,
    productName: input.productName,
    chainId: input.chainId,
    metadata: input.metadata,
    mode: input.mode,
    createdAt: now,
  };

  store.saveOneTimePayment(payment);

  return {
    payment,
    events: [createWebhookEvent("payment.created", { payment })],
  };
}

/** Find another one-time payment that already claimed this chain tx hash. */
export function findOneTimePaymentByTxHash(
  store: BillingStore,
  txHash: string,
  excludePaymentId?: string,
): OneTimePayment | null {
  const normalized = txHash.trim().toLowerCase();
  if (!normalized) return null;
  const payments =
    typeof store.listAllOneTimePayments === "function"
      ? store.listAllOneTimePayments()
      : null;
  if (!payments) return null;

  for (const payment of payments) {
    if (excludePaymentId && payment.id === excludePaymentId) continue;
    if (payment.txHash?.trim().toLowerCase() === normalized) return payment;
  }
  return null;
}

export function confirmOneTimePayment(
  store: BillingStore,
  paymentId: string,
  input: { txHash?: string } = {},
): ConfirmOneTimePaymentResult | null {
  const existing = store.getOneTimePayment(paymentId);
  if (!existing) return null;

  if (existing.status === "paid") {
    return { payment: existing, events: [], alreadyPaid: true };
  }
  if (existing.status === "canceled") {
    return null;
  }

  const txHash = input.txHash?.trim() || `sandbox_tx_${existing.id}`;
  const liveHash = txHash.startsWith("0x") && txHash.length >= 66;
  if (liveHash) {
    const reused = findOneTimePaymentByTxHash(store, txHash, paymentId);
    if (reused) return null;
  }

  const now = new Date();
  const payment: OneTimePayment = {
    ...existing,
    status: "paid",
    paidAt: now,
    txHash,
  };
  store.saveOneTimePayment(payment);

  return {
    payment,
    events: [createWebhookEvent("payment.paid", { payment })],
    alreadyPaid: false,
  };
}

export function cancelOneTimePayment(
  store: BillingStore,
  paymentId: string,
): OneTimePayment | null {
  const existing = store.getOneTimePayment(paymentId);
  if (!existing || existing.status !== "open") return null;

  const payment: OneTimePayment = {
    ...existing,
    status: "canceled",
    canceledAt: new Date(),
  };
  store.saveOneTimePayment(payment);
  return payment;
}

export function buildOneTimeCheckoutSessionView(
  store: BillingStore,
  paymentId: string,
  input: {
    sandbox: boolean;
    merchantDisplayName?: string | null;
    merchantLogoUrl?: string | null;
    merchantWebsiteUrl?: string | null;
  },
): OneTimeCheckoutSessionView | null {
  const payment = store.getOneTimePayment(paymentId);
  if (!payment) return null;

  const chain = chainConfigFor(payment.chainId);
  const amountMicro = usdcToMicro(payment.amountUsdc);
  const transferCalldata = encodeTransferCalldata(payment.payoutAddressEvm, amountMicro);
  const listFromMeta = payment.metadata?.listAmountUsdc
    ? Number(payment.metadata.listAmountUsdc)
    : null;
  const listAmountUsdc =
    listFromMeta != null && Number.isFinite(listFromMeta) && listFromMeta > payment.amountUsdc
      ? listFromMeta
      : null;

  return {
    paymentId: payment.id,
    status: payment.status,
    amountUsdc: payment.amountUsdc,
    listAmountUsdc,
    interval: "once",
    chainId: payment.chainId,
    network: chain.name,
    usdcAddress: chain.usdcAddress,
    merchantPayout: payment.payoutAddressEvm,
    customerWallet: payment.customerWallet,
    transferCalldata,
    productName: payment.productName ?? null,
    sandbox: input.sandbox,
    merchantDisplayName: input.merchantDisplayName,
    merchantLogoUrl: input.merchantLogoUrl,
    merchantWebsiteUrl: input.merchantWebsiteUrl,
    couponCode: payment.metadata?.couponCode ?? null,
    couponLabel: payment.metadata?.couponLabel ?? null,
  };
}
