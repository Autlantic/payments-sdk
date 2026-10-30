/**
 * Engine statuses have no discrete `expired`. Hosted portal / member UIs derive
 * ended access from period end + status.
 *
 * - `canceled` past currentPeriodEnd → expired
 * - cancel-at-period-end past currentPeriodEnd → expired
 * - `trialing` past currentPeriodEnd → expired (trial ended without conversion;
 *   engine may still say trialing until a charge succeeds or cancel finalizes)
 *
 * `active` / `past_due` past period end are not expired here: renewal or fix-payment
 * may still be in flight.
 */

function periodEndMs(value: Date | string | null | undefined): number {
  if (value == null) return Number.NaN;
  if (value instanceof Date) return value.getTime();
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : Number.NaN;
}

export type SubscriptionAccessSnapshot = {
  status: string;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: Date | string;
};

/** True when the customer no longer has access for this subscription period. */
export function isSubscriptionAccessExpired(
  sub: SubscriptionAccessSnapshot,
  now: Date | number = new Date(),
): boolean {
  const nowMs = typeof now === "number" ? now : now.getTime();
  const endMs = periodEndMs(sub.currentPeriodEnd);
  const periodEnded = Number.isFinite(endMs) && endMs <= nowMs;
  if (!periodEnded) return false;
  if (sub.status === "incomplete") return false;
  if (sub.status === "canceled") return true;
  if (sub.cancelAtPeriodEnd) return true;
  if (sub.status === "trialing") return true;
  return false;
}
