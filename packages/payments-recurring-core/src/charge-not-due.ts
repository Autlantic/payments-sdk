/**
 * On-chain vault charge gate: block.timestamp must be >= periodEnd (NOT_DUE).
 * Off-chain invoice dueAt can arrive slightly earlier. That is a scheduling
 * race, not a failed customer payment.
 */

const NOT_DUE_MESSAGE_NEEDLES = [
  "not due",
  "billing period is not due",
  "period is not due",
  "on-chain billing period is not due",
] as const;

export function isChargeNotDueFailure(input: {
  code?: string | null;
  message?: string | null;
}): boolean {
  const code = (input.code ?? "").trim().toUpperCase();
  if (code === "CHARGE_NOT_DUE") return true;
  const lower = (input.message ?? "").trim().toLowerCase();
  if (!lower) return false;
  return NOT_DUE_MESSAGE_NEEDLES.some((needle) => lower.includes(needle));
}

/**
 * Schedule the next worker attempt at on-chain unlock (+ buffer).
 * Never schedules in the past; keeps a short floor so polls do not tight-loop.
 */
export function deferRetryAtFromOnChainPeriodEnd(
  periodEndUnix: number,
  options: { nowMs?: number; bufferSec?: number; minAheadSec?: number } = {},
): Date {
  const nowMs = options.nowMs ?? Date.now();
  const bufferSec = options.bufferSec ?? 30;
  const minAheadSec = options.minAheadSec ?? 15;
  const unlockMs = (Math.floor(periodEndUnix) + bufferSec) * 1000;
  return new Date(Math.max(unlockMs, nowMs + minAheadSec * 1000));
}
