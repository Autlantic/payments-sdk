import type { BillingInterval } from "./types";

const MS_DAY = 24 * 60 * 60 * 1000;

/** Max intervalCount for week and month (Woo / catalog common range). */
export const MAX_INTERVAL_COUNT = 12;

function addMonths(date: Date, months: number): Date {
  const result = new Date(date.getTime());
  const day = result.getUTCDate();
  result.setUTCMonth(result.getUTCMonth() + months);
  if (result.getUTCDate() !== day) {
    result.setUTCDate(0);
  }
  return result;
}

function addYears(date: Date, years: number): Date {
  const result = new Date(date.getTime());
  result.setUTCFullYear(result.getUTCFullYear() + years);
  return result;
}

/**
 * Normalize intervalCount. Missing / invalid → 1.
 * Does not enforce interval-specific max; use assertValidIntervalCount for that.
 */
export function normalizeIntervalCount(value: unknown): number {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n) || n < 1) return 1;
  return n;
}

/**
 * Validate intervalCount for a billing interval.
 * week/month: 1..12; year and five_minute: 1 only.
 */
export function assertValidIntervalCount(
  interval: BillingInterval,
  intervalCount: number,
): void {
  if (!Number.isInteger(intervalCount) || intervalCount < 1) {
    throw new Error("intervalCount must be a positive integer");
  }
  if (interval === "year" || interval === "five_minute") {
    if (intervalCount !== 1) {
      throw new Error(
        `intervalCount must be 1 for interval "${interval}" (got ${intervalCount})`,
      );
    }
    return;
  }
  if (intervalCount > MAX_INTERVAL_COUNT) {
    throw new Error(
      `intervalCount for "${interval}" must be between 1 and ${MAX_INTERVAL_COUNT} (got ${intervalCount})`,
    );
  }
}

/** Compute the next billing period end from a start date, interval, and count. */
export function periodEndFromStart(
  start: Date,
  interval: BillingInterval,
  intervalCount: number = 1,
): Date {
  const count = normalizeIntervalCount(intervalCount);
  assertValidIntervalCount(interval, count);

  if (interval === "five_minute") {
    return new Date(start.getTime() + 5 * 60 * 1000 * count);
  }
  if (interval === "week") {
    return new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000 * count);
  }
  if (interval === "year") {
    return addYears(start, count);
  }
  return addMonths(start, count);
}

/** Advance one billing period from the current period end. */
export function nextPeriodEnd(
  currentPeriodEnd: Date,
  interval: BillingInterval,
  intervalCount: number = 1,
): Date {
  return periodEndFromStart(currentPeriodEnd, interval, intervalCount);
}

/** Trial window end from start (whole days). Returns start when trialDays is not positive. */
export function trialEndFromStart(start: Date, trialDays: number): Date {
  const days = Math.floor(Number(trialDays));
  if (!Number.isFinite(days) || days <= 0) return new Date(start);
  return new Date(start.getTime() + days * MS_DAY);
}

/** Normalize catalog/API trial day counts (non-finite → 0, floor, min 0). */
export function normalizeTrialDays(value: unknown): number {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n) || n <= 0) return 0;
  return n;
}

/** Default rolling allowance cap: 3 billing periods worth (6 USDC decimals). */
export function defaultAllowanceCapUsdc(amountUsdc: number, _interval: BillingInterval): number {
  return roundUsdc(amountUsdc * 3);
}

function roundUsdc(amount: number): number {
  return Math.round(amount * 1e6) / 1e6;
}

/** On-chain vault period duration for one billing cycle (interval × count). */
export function intervalPeriodSeconds(
  interval: BillingInterval,
  intervalCount: number = 1,
): number {
  const count = normalizeIntervalCount(intervalCount);
  assertValidIntervalCount(interval, count);

  if (interval === "five_minute") return 5 * 60 * count;
  if (interval === "week") return 7 * 24 * 60 * 60 * count;
  if (interval === "year") return 365 * 24 * 60 * 60 * count;
  return 30 * 24 * 60 * 60 * count;
}

export { MS_DAY };
