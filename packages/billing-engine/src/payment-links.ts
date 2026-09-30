import {
  assertPositiveAmountUsdc,
  normalizeEvmAddress,
  type BillingChainId,
} from "@autlantic/payments-recurring-core";
import { newId } from "./id";
import {
  createOneTimePayment,
  type CreateOneTimePaymentResult,
  type OneTimePayment,
} from "./one-time";
import type { BillingStore } from "./types";

export type PaymentLinkStatus = "active" | "disabled" | "expired";

export type PaymentLink = {
  id: string;
  merchantId: string;
  /** Prefix used when minting payments (`merchantRef` = `${merchantRefPrefix}_${n}`). */
  merchantRefPrefix: string;
  payoutAddressEvm: string;
  amountUsdc: number;
  status: PaymentLinkStatus;
  priceId?: string;
  productName?: string;
  description?: string;
  chainId: BillingChainId;
  /** null / undefined = unlimited */
  maxUses?: number | null;
  useCount: number;
  expiresAt?: Date | null;
  metadata?: Record<string, string>;
  mode?: "test" | "live";
  createdAt: Date;
  disabledAt?: Date;
};

export type CreatePaymentLinkInput = {
  merchantId: string;
  merchantRefPrefix: string;
  payoutAddressEvm: string;
  amountUsdc: number;
  chainId: BillingChainId;
  priceId?: string;
  productName?: string;
  description?: string;
  maxUses?: number | null;
  expiresAt?: Date | null;
  metadata?: Record<string, string>;
  mode?: "test" | "live";
};

export type OpenPaymentLinkInput = {
  customerWallet: string;
  /** Optional override; defaults to `${prefix}_${useCount+1}`. */
  merchantRef?: string;
};

export type OpenPaymentLinkResult = {
  paymentLink: PaymentLink;
  payment: OneTimePayment;
  events: CreateOneTimePaymentResult["events"];
};

export function paymentLinkIsOpen(link: PaymentLink, now: Date = new Date()): boolean {
  if (link.status === "disabled" || link.disabledAt) return false;
  if (link.status !== "active") return false;
  if (link.expiresAt && link.expiresAt.getTime() <= now.getTime()) return false;
  if (link.maxUses != null && link.useCount >= link.maxUses) return false;
  return true;
}

export function resolvePaymentLinkStatus(
  link: PaymentLink,
  now: Date = new Date(),
): PaymentLinkStatus {
  if (link.status === "disabled" || link.disabledAt) return "disabled";
  if (link.expiresAt && link.expiresAt.getTime() <= now.getTime()) return "expired";
  if (link.maxUses != null && link.useCount >= link.maxUses) return "expired";
  return "active";
}

export function createPaymentLink(
  store: BillingStore,
  input: CreatePaymentLinkInput,
): PaymentLink {
  assertPositiveAmountUsdc(input.amountUsdc);
  const prefix = input.merchantRefPrefix.trim();
  if (!prefix) {
    throw new Error("merchantRefPrefix is required");
  }
  if (input.maxUses != null && (!Number.isInteger(input.maxUses) || input.maxUses < 1)) {
    throw new Error("maxUses must be a positive integer when set");
  }

  const link: PaymentLink = {
    id: newId("plink"),
    merchantId: input.merchantId,
    merchantRefPrefix: prefix,
    payoutAddressEvm: normalizeEvmAddress(input.payoutAddressEvm),
    amountUsdc: input.amountUsdc,
    status: "active",
    priceId: input.priceId,
    productName: input.productName,
    description: input.description?.trim() || undefined,
    chainId: input.chainId,
    maxUses: input.maxUses ?? null,
    useCount: 0,
    expiresAt: input.expiresAt ?? null,
    metadata: input.metadata,
    mode: input.mode,
    createdAt: new Date(),
  };

  store.savePaymentLink(link);
  return link;
}

export function disablePaymentLink(
  store: BillingStore,
  linkId: string,
): PaymentLink | null {
  const existing = store.getPaymentLink(linkId);
  if (!existing) return null;
  if (existing.status === "disabled" || existing.disabledAt) {
    return {
      ...existing,
      status: "disabled",
      disabledAt: existing.disabledAt ?? new Date(),
    };
  }

  const link: PaymentLink = {
    ...existing,
    status: "disabled",
    disabledAt: new Date(),
  };
  store.savePaymentLink(link);
  return link;
}

export type UpdatePaymentLinkInput = {
  description?: string | null;
  maxUses?: number | null;
  expiresAt?: Date | null;
  metadata?: Record<string, string> | null;
};

/** Patch merchant-editable fields on an active payment link. */
export function updatePaymentLink(
  store: BillingStore,
  linkId: string,
  input: UpdatePaymentLinkInput,
): PaymentLink | null {
  const existing = store.getPaymentLink(linkId);
  if (!existing) return null;
  if (resolvePaymentLinkStatus(existing) === "disabled") {
    throw new Error("Disabled payment links cannot be edited");
  }

  if (input.maxUses != null && (!Number.isInteger(input.maxUses) || input.maxUses < 1)) {
    throw new Error("maxUses must be a positive integer when set");
  }
  if (
    input.maxUses != null &&
    existing.useCount > 0 &&
    input.maxUses < existing.useCount
  ) {
    throw new Error("maxUses cannot be less than opens already recorded");
  }

  const link: PaymentLink = {
    ...existing,
    description:
      input.description === undefined
        ? existing.description
        : input.description?.trim() || undefined,
    maxUses: input.maxUses === undefined ? existing.maxUses : input.maxUses,
    expiresAt: input.expiresAt === undefined ? existing.expiresAt : input.expiresAt,
    metadata:
      input.metadata === undefined
        ? existing.metadata
        : input.metadata === null
          ? undefined
          : input.metadata,
  };
  store.savePaymentLink(link);
  return link;
}

export function deletePaymentLink(store: BillingStore, linkId: string): boolean {
  const existing = store.getPaymentLink(linkId);
  if (!existing) return false;
  if (typeof store.deletePaymentLink === "function") {
    store.deletePaymentLink(linkId);
    return true;
  }
  // Fallback stores without delete: mark disabled so checkout rejects.
  disablePaymentLink(store, linkId);
  return true;
}

/**
 * Mint a one-time payment from an active payment link.
 * Caller supplies the payer wallet (from hosted checkout connect).
 */
export function openPaymentLink(
  store: BillingStore,
  linkId: string,
  input: OpenPaymentLinkInput,
): OpenPaymentLinkResult | { error: string } {
  const existing = store.getPaymentLink(linkId);
  if (!existing) return { error: "Payment link not found" };

  const now = new Date();
  const resolved = resolvePaymentLinkStatus(existing, now);
  if (resolved === "disabled") return { error: "Payment link is disabled" };
  if (resolved === "expired") {
    if (existing.status === "active") {
      store.savePaymentLink({ ...existing, status: "expired" });
    }
    return { error: "Payment link has expired" };
  }
  if (!paymentLinkIsOpen(existing, now)) {
    return { error: "Payment link is not available" };
  }

  const nextCount = existing.useCount + 1;
  const merchantRef =
    input.merchantRef?.trim() || `${existing.merchantRefPrefix}_${nextCount}`;

  const created = createOneTimePayment(store, {
    merchantId: existing.merchantId,
    merchantRef,
    customerWallet: input.customerWallet,
    payoutAddressEvm: existing.payoutAddressEvm,
    amountUsdc: existing.amountUsdc,
    chainId: existing.chainId,
    priceId: existing.priceId,
    productName: existing.productName,
    metadata: {
      ...(existing.metadata ?? {}),
      paymentLinkId: existing.id,
      ...(existing.description ? { paymentLinkDescription: existing.description } : {}),
    },
    mode: existing.mode,
  });

  const link: PaymentLink = {
    ...existing,
    useCount: nextCount,
    status:
      existing.maxUses != null && nextCount >= existing.maxUses ? "expired" : existing.status,
  };
  store.savePaymentLink(link);

  return {
    paymentLink: link,
    payment: created.payment,
    events: created.events,
  };
}
