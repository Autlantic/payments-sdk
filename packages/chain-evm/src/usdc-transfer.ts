import type { BillingChainId } from "@autlantic/payments-recurring-core";
import { chainConfigFor, microToUsdc, usdcToMicro } from "./constants";

export const ERC20_TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

export type EvmTxLog = {
  address?: string;
  topics?: string[];
  data?: string;
};

export type UsdcTransferMatch = {
  from: string;
  to: string;
  amountUsdc: number;
  amountMicro: bigint;
};

export type UsdcPassPaymentIntent = {
  chainId: BillingChainId;
  usdcAddress: string;
  payoutAddress: string;
  expectedAmountUsdc: number;
};

export type UsdcTransferVerificationFailure = {
  ok: false;
  code: string;
  message: string;
  expectedUsdc?: number;
  receivedUsdc?: number;
  shortfallUsdc?: number;
};

function normalizeAddress(address: string): string {
  return address.trim().toLowerCase();
}

function topicToAddress(topic: string): string {
  return `0x${topic.slice(26).toLowerCase()}`;
}

/** ERC-20 transfer(address,uint256) calldata for wallet sendTransaction. */
export function encodeTransferCalldata(to: string, amountMicro: bigint): string {
  const selector = "a9059cbb";
  const toPadded = to.slice(2).toLowerCase().padStart(64, "0");
  const amountHex = amountMicro.toString(16).padStart(64, "0");
  return `0x${selector}${toPadded}${amountHex}`;
}

export function findUsdcTransfersInLogs(
  logs: EvmTxLog[],
  input: { usdcAddress: string; payoutAddress: string },
): UsdcTransferMatch[] {
  const usdc = normalizeAddress(input.usdcAddress);
  const payout = normalizeAddress(input.payoutAddress);
  const matches: UsdcTransferMatch[] = [];

  for (const log of logs) {
    if (!log.address || normalizeAddress(log.address) !== usdc) continue;
    if (!log.topics?.[0] || normalizeAddress(log.topics[0]) !== ERC20_TRANSFER_TOPIC) {
      continue;
    }
    if (log.topics.length < 3) continue;

    const to = topicToAddress(log.topics[2]);
    if (to !== payout) continue;

    const amountMicro = BigInt(log.data ?? "0x0");
    matches.push({
      from: topicToAddress(log.topics[1]),
      to,
      amountUsdc: microToUsdc(amountMicro),
      amountMicro,
    });
  }

  return matches;
}

export function verifyUsdcTransferAgainstIntent(
  intent: UsdcPassPaymentIntent,
  transfer: UsdcTransferMatch,
): { ok: true } | UsdcTransferVerificationFailure {
  if (normalizeAddress(transfer.to) !== normalizeAddress(intent.payoutAddress)) {
    return {
      ok: false,
      code: "PAYMENT_WRONG_RECIPIENT",
      message: "Payment was sent to the wrong wallet address.",
    };
  }

  const expectedMicro = usdcToMicro(intent.expectedAmountUsdc);
  if (transfer.amountMicro < expectedMicro) {
    const expectedUsdc = intent.expectedAmountUsdc;
    const receivedUsdc = transfer.amountUsdc;
    const shortfallUsdc = microToUsdc(expectedMicro - transfer.amountMicro);
    return {
      ok: false,
      code: "PAYMENT_SHORT",
      message: `Payment amount is too low. Expected ${expectedUsdc} USDC, received ${receivedUsdc} USDC.`,
      expectedUsdc,
      receivedUsdc,
      shortfallUsdc,
    };
  }

  return { ok: true };
}

function chainRpcUrl(chainId: BillingChainId): string {
  return chainConfigFor(chainId).rpcUrl;
}

export async function fetchTransactionReceipt(
  chainId: BillingChainId,
  txHash: string,
): Promise<{ status: "success" | "reverted"; logs: EvmTxLog[] } | null> {
  const maxAttempts = 5;
  let lastError = "eth_getTransactionReceipt failed";

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const res = await fetch(chainRpcUrl(chainId), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_getTransactionReceipt",
        params: [txHash],
      }),
    });

    const json = (await res.json()) as {
      result?: { status?: string; logs?: EvmTxLog[] } | null;
      error?: { message?: string };
    };

    if (json.error) {
      lastError = json.error.message ?? lastError;
      const retryable = /rate limit|too many requests|429|timeout|temporarily unavailable|over rate limit/i.test(
        lastError,
      );
      if (!retryable || attempt === maxAttempts - 1) {
        throw new Error(lastError);
      }
      await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
      continue;
    }

    if (!json.result) return null;

    return {
      status: json.result.status === "0x0" ? "reverted" : "success",
      logs: json.result.logs ?? [],
    };
  }

  throw new Error(lastError);
}

export async function verifyUsdcPassPaymentFromTxHash(
  intent: UsdcPassPaymentIntent,
  txHash: string,
): Promise<
  | { ok: true; transfer: UsdcTransferMatch; txHash: string }
  | UsdcTransferVerificationFailure
> {
  const receipt = await fetchTransactionReceipt(intent.chainId, txHash);
  if (!receipt) {
    return {
      ok: false,
      code: "PAYMENT_TX_NOT_FOUND",
      message: "Transaction not found on chain yet. Wait a minute and try again.",
    };
  }

  if (receipt.status === "reverted") {
    return {
      ok: false,
      code: "PAYMENT_TX_REVERTED",
      message: "Transaction failed on chain.",
    };
  }

  const transfers = findUsdcTransfersInLogs(receipt.logs, {
    usdcAddress: intent.usdcAddress,
    payoutAddress: intent.payoutAddress,
  });

  if (transfers.length === 0) {
    return {
      ok: false,
      code: "PAYMENT_TX_NO_TRANSFER",
      message: "No matching USDC transfer to the creator wallet was found in this transaction.",
    };
  }

  const transfer = transfers.reduce((best, current) =>
    current.amountMicro > best.amountMicro ? current : best,
  );

  const verified = verifyUsdcTransferAgainstIntent(intent, transfer);
  if (!verified.ok) return verified;

  return { ok: true, transfer, txHash };
}
