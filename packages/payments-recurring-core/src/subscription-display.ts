import { isSubscriptionAccessExpired } from "./subscription-access";
import type { SubscriptionStatus } from "./types";

/** Merchant CRM badge / filter bucket (engine status + derived expired). */
export type SubscriptionDisplayStatus =
  | SubscriptionStatus
  | "expired";

export function subscriptionDisplayStatus(
  sub: {
    status: string;
    cancelAtPeriodEnd?: boolean;
    currentPeriodEnd: Date | string;
  },
  now: Date = new Date(),
): SubscriptionDisplayStatus {
  if (
    isSubscriptionAccessExpired(
      {
        status: sub.status,
        cancelAtPeriodEnd: Boolean(sub.cancelAtPeriodEnd),
        currentPeriodEnd: sub.currentPeriodEnd,
      },
      now,
    )
  ) {
    return "expired";
  }
  return sub.status as SubscriptionStatus;
}

export function subscriptionDisplayLabel(status: SubscriptionDisplayStatus): string {
  switch (status) {
    case "incomplete":
      return "Incomplete";
    case "trialing":
      return "Trialing";
    case "active":
      return "Active";
    case "past_due":
      return "Past due";
    case "canceled":
      return "Canceled";
    case "expired":
      return "Expired";
    default:
      return status;
  }
}
