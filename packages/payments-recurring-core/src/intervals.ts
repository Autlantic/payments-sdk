import type { BillingInterval } from "./types";

const MS_DAY = 24 * 60 * 60 * 1000;

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  const day = result.getDate();
  result.setMonth(result.getMonth() + months);
  if (result.getDate() !== day) {
    result.setDate(0);
  }
  return result;
}

function addYears(date: Date, years: number): Date {
  const result = new Date(date);
  result.setFullYear(result.getFullYear() + years);
  return result;
}

/** Compute the next billing period end from a start date and interval. */
export function periodEndFromStart(start: Date, interval: BillingInterval): Date {
  if (interval === "five_minute") {
    return new Date(start.getTime() + 5 * 60 * 1000);
  }
  if (interval === "week") {
    return new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
  }
  if (interval === "year") {
    return addYears(start, 1);
  }
  return addMonths(start, 1);
}

/** Advance one billing period from the current period end. */
export function nextPeriodEnd(currentPeriodEnd: Date, interval: BillingInterval): Date {
  return periodEndFromStart(currentPeriodEnd, interval);
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

export function intervalPeriodSeconds(interval: BillingInterval): number {
  if (interval === "five_minute") return 5 * 60;
  if (interval === "week") return 7 * 24 * 60 * 60;
  if (interval === "year") return 365 * 24 * 60 * 60;
  return 30 * 24 * 60 * 60;
}

export { MS_DAY };
