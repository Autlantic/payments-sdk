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

/** Default rolling allowance cap: N billing periods worth (6 USDC decimals). */
export function defaultAllowanceCapUsdc(amountUsdc: number, interval: BillingInterval): number {
  if (interval === "five_minute") {
    return roundUsdc(amountUsdc * 12);
  }
  const periods = interval === "year" ? 3 : 12;
  return roundUsdc(amountUsdc * periods);
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
