import type { BillingChainId, InvoiceFailureCode } from "@autlantic/payments-recurring-core";
import { microToUsdc, usdcToMicro } from "./constants";
import { readUsdcAllowance } from "./allowance";
import {
  encodeSubscriptionsViewCalldata,
  parseSubscriptionsViewResult,
  type VaultSubscriptionView,
} from "./vault";

const BALANCE_OF_SELECTOR = "0x70a08231";
const NEXT_SUBSCRIPTION_ID_SELECTOR = "0xda58935f";

function normalizeEvmAddress(address: string): string {
  return address.trim().toLowerCase();
}

async function readVaultNextSubscriptionId(input: {
  chainId: BillingChainId;
  vaultAddress: string;
}): Promise<number> {
  const result = await ethCall(input.chainId, input.vaultAddress, NEXT_SUBSCRIPTION_ID_SELECTOR);
  const nextId = Number(BigInt(result));
  return Number.isFinite(nextId) && nextId > 0 ? nextId : 1;
}

/** Finds the latest active vault subscription for a checkout resume (after page refresh). */
export async function findVaultSubscriptionForCheckout(input: {
  chainId: BillingChainId;
  vaultAddress: string;
  customerWallet: string;
  merchantWallet: string;
  amountUsdc: number;
  maxScan?: number;
}): Promise<string | null> {
  const customer = normalizeEvmAddress(input.customerWallet);
  const merchant = normalizeEvmAddress(input.merchantWallet);
  const amountMicro = usdcToMicro(input.amountUsdc);
  const maxScan = input.maxScan ?? 32;
  const concurrency = 8;

  let upperBound = maxScan;
  try {
    upperBound = Math.min(maxScan, (await readVaultNextSubscriptionId(input)) - 1);
  } catch {
    // Fall back to a small scan window when RPC is flaky.
  }

  if (upperBound < 1) return null;

  for (let start = upperBound; start >= 1; start -= concurrency) {
    const ids: number[] = [];
    for (let id = start; id >= Math.max(1, start - concurrency + 1); id -= 1) {
      ids.push(id);
    }

    const matches = await Promise.all(
      ids.map(async (id) => {
        try {
          const sub = await readVaultSubscription({
            chainId: input.chainId,
            vaultAddress: input.vaultAddress,
            onChainSubscriptionId: String(id),
          });
          if (!sub?.active) return null;
          if (normalizeEvmAddress(sub.customer) !== customer) return null;
          if (normalizeEvmAddress(sub.merchant) !== merchant) return null;
          if (sub.amountPerPeriodMicro !== amountMicro) return null;
          return String(id);
        } catch {
          return null;
        }
      }),
    );

    const hit = matches.find((value): value is string => Boolean(value));
    if (hit) return hit;
  }

  return null;
}

function encodeBalanceOfCalldata(owner: string): string {
  return `${BALANCE_OF_SELECTOR}${owner.slice(2).toLowerCase().padStart(64, "0")}`;
}

function chainRpcUrl(chainId: BillingChainId): string {
  if (chainId === 8453) {
    return process.env.AUTLANTIC_BASE_RPC_URL?.trim() || "https://mainnet.base.org";
  }
  return process.env.AUTLANTIC_BASE_SEPOLIA_RPC_URL?.trim() || "https://sepolia.base.org";
}

async function ethCall(chainId: BillingChainId, to: string, data: string): Promise<string> {
  const maxAttempts = 8;
  let lastError = "eth_call failed";

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const res = await fetch(chainRpcUrl(chainId), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_call",
        params: [{ to, data }, "latest"],
      }),
    });
    const json = (await res.json()) as { result?: string; error?: { message?: string } };

    if (json.result) {
      return json.result;
    }

    lastError = json.error?.message ?? "eth_call failed";
    const retryable = /rate limit|too many requests|429|timeout|temporarily unavailable|over rate limit/i.test(
      lastError,
    );
    if (!retryable || attempt === maxAttempts - 1) {
      throw new Error(lastError);
    }

    await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
  }

  throw new Error(lastError);
}

export async function readUsdcBalance(input: {
  chainId: BillingChainId;
  usdcAddress: string;
  owner: string;
}): Promise<number> {
  const result = await ethCall(
    input.chainId,
    input.usdcAddress,
    encodeBalanceOfCalldata(input.owner),
  );
  return microToUsdc(BigInt(result));
}

export async function readVaultSubscription(input: {
  chainId: BillingChainId;
  vaultAddress: string;
  onChainSubscriptionId: string;
}): Promise<ReturnType<typeof parseSubscriptionsViewResult>> {
  const id = BigInt(input.onChainSubscriptionId.replace(/\D/g, "") || "0");
  const result = await ethCall(
    input.chainId,
    input.vaultAddress,
    encodeSubscriptionsViewCalldata(id),
  );
  return parseSubscriptionsViewResult(result);
}

export type PreflightChargeResult =
  | { ok: true }
  | { ok: false; code: InvoiceFailureCode; message: string };

export async function waitUntilVaultChargeDue(input: {
  chainId: BillingChainId;
  vaultAddress: string;
  onChainSubscriptionId: string;
  maxWaitMs?: number;
}): Promise<void> {
  const maxWaitMs = input.maxWaitMs ?? 120_000;
  const started = Date.now();
  let lastError: string | null = null;

  while (Date.now() - started < maxWaitMs) {
    try {
      const sub = await readVaultSubscription({
        chainId: input.chainId,
        vaultAddress: input.vaultAddress,
        onChainSubscriptionId: input.onChainSubscriptionId,
      });

      if (!sub) {
        throw new Error("On-chain subscription not found after vault signup.");
      }

      const now = Math.floor(Date.now() / 1000);
      const remainingSec = sub.periodEnd - now;
      if (remainingSec <= 0) {
        return;
      }

      const remainingMs = Math.min(
        (remainingSec + 2) * 1000,
        maxWaitMs - (Date.now() - started),
      );
      if (remainingMs <= 0) break;
      await new Promise((resolve) => setTimeout(resolve, remainingMs));
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      const retryable = /rate limit|too many requests|429|timeout|temporarily unavailable|over rate limit/i.test(
        lastError,
      );
      if (!retryable) throw err;
      await new Promise((resolve) => setTimeout(resolve, 8_000));
    }
  }

  throw new Error(
    lastError ??
      "Vault signup confirmed, but the first charge is not ready yet. Wait a minute and tap Complete payment again.",
  );
}

/** On-chain checks before relayer charge (live mode). */
export async function preflightLiveCharge(input: {
  chainId: BillingChainId;
  usdcAddress: string;
  vaultAddress: string;
  onChainSubscriptionId: string;
  customerWallet: string;
  amountUsdc: number;
  allowanceCapUsdc: number;
}): Promise<PreflightChargeResult> {
  try {
    const sub = await readVaultSubscription({
      chainId: input.chainId,
      vaultAddress: input.vaultAddress,
      onChainSubscriptionId: input.onChainSubscriptionId,
    });

    if (!sub) {
      return { ok: false, code: "RELAYER_ERROR", message: "On-chain subscription not found" };
    }
    if (!sub.active) {
      return { ok: false, code: "MANDATE_INACTIVE", message: "On-chain subscription is inactive" };
    }
    if (sub.cancelAtPeriodEnd) {
      return { ok: false, code: "MANDATE_INACTIVE", message: "On-chain subscription is canceling" };
    }

    const now = Math.floor(Date.now() / 1000);
    if (now < sub.periodEnd) {
      return { ok: false, code: "RELAYER_ERROR", message: "On-chain billing period is not due yet" };
    }

    const allowance = await readUsdcAllowance({
      chainId: input.chainId,
      usdcAddress: input.usdcAddress,
      owner: input.customerWallet,
      spender: input.vaultAddress,
    });

    if (usdcToMicro(allowance) < usdcToMicro(input.amountUsdc)) {
      return {
        ok: false,
        code: "ALLOWANCE_REVOKED",
        message: "USDC allowance is too low for this charge",
      };
    }
    if (usdcToMicro(allowance) < usdcToMicro(input.allowanceCapUsdc)) {
      return {
        ok: false,
        code: "ALLOWANCE_TOO_LOW",
        message: "USDC allowance is below the rolling cap",
      };
    }

    const balance = await readUsdcBalance({
      chainId: input.chainId,
      usdcAddress: input.usdcAddress,
      owner: input.customerWallet,
    });

    if (usdcToMicro(balance) < usdcToMicro(input.amountUsdc)) {
      return {
        ok: false,
        code: "INSUFFICIENT_BALANCE",
        message: "Wallet has insufficient USDC for this charge",
      };
    }

    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      code: "RELAYER_ERROR",
      message: err instanceof Error ? err.message : "Preflight check failed",
    };
  }
}

export async function preflightLiveRefund(input: {
  chainId: BillingChainId;
  usdcAddress: string;
  vaultAddress: string;
  merchantWallet: string;
  amountUsdc: number;
}): Promise<PreflightChargeResult> {
  try {
    const allowance = await readUsdcAllowance({
      chainId: input.chainId,
      usdcAddress: input.usdcAddress,
      owner: input.merchantWallet,
      spender: input.vaultAddress,
    });

    if (usdcToMicro(allowance) < usdcToMicro(input.amountUsdc)) {
      return {
        ok: false,
        code: "ALLOWANCE_TOO_LOW",
        message: "Merchant must approve the vault for refunds",
      };
    }

    const balance = await readUsdcBalance({
      chainId: input.chainId,
      usdcAddress: input.usdcAddress,
      owner: input.merchantWallet,
    });

    if (usdcToMicro(balance) < usdcToMicro(input.amountUsdc)) {
      return {
        ok: false,
        code: "INSUFFICIENT_BALANCE",
        message: "Merchant wallet has insufficient USDC for refund",
      };
    }

    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      code: "RELAYER_ERROR",
      message: err instanceof Error ? err.message : "Refund preflight failed",
    };
  }
}

export { usdcToMicro };

export function isVaultSubscriptionCharged(view: VaultSubscriptionView): boolean {
  const billedSpan = view.periodEnd - view.periodStart;
  return billedSpan >= view.periodDurationSeconds * 0.99;
}

const CHARGED_EVENT_TOPIC =
  "0xfc1ff8efff6b5f0b2507545924be95e555a76a7d6052c2a78d10b3038fb6bb94";

export async function findVaultChargeTxHash(input: {
  chainId: BillingChainId;
  vaultAddress: string;
  onChainSubscriptionId: string;
}): Promise<string | null> {
  const id = BigInt(input.onChainSubscriptionId.replace(/\D/g, "") || "0");
  const topic1 = `0x${id.toString(16).padStart(64, "0")}`;

  const res = await fetch(chainRpcUrl(input.chainId), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_getLogs",
      params: [
        {
          address: input.vaultAddress,
          topics: [CHARGED_EVENT_TOPIC, topic1],
          fromBlock: "0x0",
          toBlock: "latest",
        },
      ],
    }),
  });
  const json = (await res.json()) as { result?: Array<{ transactionHash?: string }> };
  const logs = json.result ?? [];
  const latest = logs[logs.length - 1];
  return latest?.transactionHash ?? null;
}
