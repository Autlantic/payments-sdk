/**
 * Autlantic Billing workspace bands (Phase 1).
 * Soft Live free band + flat Growth fee. No % take rate on merchant volume.
 */

/** Live free band: successful Live charges per UTC calendar month before Growth is required. */
export const WORKSPACE_LIVE_FREE_CHARGE_LIMIT = 100;

/** Growth workspace fee in USDC per month (list price; VAT handled separately). */
export const WORKSPACE_GROWTH_PRICE_USDC = 49;

/** Soft overage days after exceeding the free band before new Live creates are blocked. */
export const WORKSPACE_FREE_OVERAGE_GRACE_DAYS = 7;

/** Stable API / portal error when Live creates are blocked pending Growth upgrade. */
export const WORKSPACE_PLAN_REQUIRED_ERROR_CODE = "workspace_plan_required" as const;

/** Metadata key on Growth fee invoices / one-time payments (exclude from free-band count). */
export const WORKSPACE_GROWTH_FEE_METADATA_KEY = "autlanticWorkspaceFee";

/** Metadata value for the Growth workspace fee. */
export const WORKSPACE_GROWTH_FEE_METADATA_VALUE = "growth";

export type WorkspacePlan = "free" | "growth";

export type WorkspaceStatus = "none" | "active" | "past_due" | "canceled";

export type WorkspaceEntitlementReason =
  | "test_mode"
  | "growth_active"
  | "ops_override"
  | "within_free_band"
  | "grace_period"
  | "workspace_plan_required";

export type WorkspaceEntitlementState = {
  /** API key / record mode. Test never enforces bands. */
  mode: "test" | "live";
  workspacePlan: WorkspacePlan;
  workspaceStatus: WorkspaceStatus;
  /** Growth subscription current period end (inclusive of access until this instant). */
  workspacePeriodEnd: Date | null;
  /** Ops temporary override; when in the future, Live creates stay allowed. */
  workspaceOverrideUntil: Date | null;
  liveSuccessfulChargesThisMonth: number;
  /**
   * When the free band was first exceeded this month (for grace).
   * Null if still within the free band or unknown.
   */
  freeBandExceededAt: Date | null;
  now?: Date;
  liveFreeChargeLimit?: number;
  graceDays?: number;
};

export type WorkspaceEntitlement = {
  /** Whether new Live creates (subs, one-time, payment-link pays) may proceed. */
  allowNewLiveCreates: boolean;
  /** True when Live free count is over the limit (Growth / override / grace may still allow). */
  freeBandExceeded: boolean;
  /** Soft overage still in progress (show portal banner). */
  inGracePeriod: boolean;
  /** When grace ends, if exceeded and no Growth/override. */
  graceEndsAt: Date | null;
  reason: WorkspaceEntitlementReason;
  liveSuccessfulChargesThisMonth: number;
  liveFreeChargeLimit: number;
  /** True when merchant should upgrade (exceeded and not on active Growth). */
  upgradeRequired: boolean;
};

/** UTC calendar month key `YYYY-MM` for Live successful-charge counters. */
export function utcMonthKey(date: Date = new Date()): string {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + 1;
  return `${y}-${String(m).padStart(2, "0")}`;
}

export function isLiveFreeBandExceeded(
  count: number,
  limit: number = WORKSPACE_LIVE_FREE_CHARGE_LIMIT,
): boolean {
  if (!Number.isFinite(count) || count < 0) return false;
  if (!Number.isFinite(limit) || limit < 0) return false;
  return count > limit;
}

/**
 * Whether a paid event should increment the merchant's Live successful-charge counter.
 * Excludes Test mode and Autlantic Growth workspace-fee charges for that merchant.
 */
export function countsTowardLiveSuccessfulCharges(input: {
  mode: "test" | "live";
  isWorkspaceGrowthFee: boolean;
}): boolean {
  if (input.mode !== "live") return false;
  if (input.isWorkspaceGrowthFee) return false;
  return true;
}

/** True when metadata marks an invoice/payment as the Autlantic Growth workspace fee. */
export function isWorkspaceGrowthFeeMetadata(
  metadata: Record<string, unknown> | null | undefined,
): boolean {
  if (!metadata || typeof metadata !== "object") return false;
  const value = metadata[WORKSPACE_GROWTH_FEE_METADATA_KEY];
  return value === WORKSPACE_GROWTH_FEE_METADATA_VALUE;
}

function addUtcDays(date: Date, days: number): Date {
  const out = new Date(date.getTime());
  out.setUTCDate(out.getUTCDate() + days);
  return out;
}

function isGrowthEntitled(
  plan: WorkspacePlan,
  status: WorkspaceStatus,
  periodEnd: Date | null,
  now: Date,
): boolean {
  if (plan !== "growth") return false;
  if (status !== "active") return false;
  if (periodEnd == null) return true;
  return periodEnd.getTime() >= now.getTime();
}

function isOpsOverrideActive(overrideUntil: Date | null, now: Date): boolean {
  return overrideUntil != null && overrideUntil.getTime() > now.getTime();
}

/**
 * Resolve whether a merchant may open new Live charges under workspace bands.
 * Renewals are not gated by this helper (callers must only check create paths).
 */
export function workspaceEntitlementFromState(
  state: WorkspaceEntitlementState,
): WorkspaceEntitlement {
  const now = state.now ?? new Date();
  const limit = state.liveFreeChargeLimit ?? WORKSPACE_LIVE_FREE_CHARGE_LIMIT;
  const graceDays = state.graceDays ?? WORKSPACE_FREE_OVERAGE_GRACE_DAYS;
  const count = Math.max(0, Math.floor(state.liveSuccessfulChargesThisMonth));
  const freeBandExceeded = isLiveFreeBandExceeded(count, limit);

  const base = {
    freeBandExceeded,
    liveSuccessfulChargesThisMonth: count,
    liveFreeChargeLimit: limit,
  };

  if (state.mode === "test") {
    return {
      ...base,
      allowNewLiveCreates: true,
      inGracePeriod: false,
      graceEndsAt: null,
      reason: "test_mode",
      upgradeRequired: false,
    };
  }

  if (
    isGrowthEntitled(
      state.workspacePlan,
      state.workspaceStatus,
      state.workspacePeriodEnd,
      now,
    )
  ) {
    return {
      ...base,
      allowNewLiveCreates: true,
      inGracePeriod: false,
      graceEndsAt: null,
      reason: "growth_active",
      upgradeRequired: false,
    };
  }

  if (isOpsOverrideActive(state.workspaceOverrideUntil, now)) {
    return {
      ...base,
      allowNewLiveCreates: true,
      inGracePeriod: false,
      graceEndsAt: null,
      reason: "ops_override",
      upgradeRequired: freeBandExceeded,
    };
  }

  if (!freeBandExceeded) {
    return {
      ...base,
      allowNewLiveCreates: true,
      inGracePeriod: false,
      graceEndsAt: null,
      reason: "within_free_band",
      upgradeRequired: false,
    };
  }

  const exceededAt = state.freeBandExceededAt ?? now;
  const graceEndsAt = addUtcDays(exceededAt, graceDays);
  const inGracePeriod = now.getTime() < graceEndsAt.getTime();

  if (inGracePeriod) {
    return {
      ...base,
      allowNewLiveCreates: true,
      inGracePeriod: true,
      graceEndsAt,
      reason: "grace_period",
      upgradeRequired: true,
    };
  }

  return {
    ...base,
    allowNewLiveCreates: false,
    inGracePeriod: false,
    graceEndsAt,
    reason: "workspace_plan_required",
    upgradeRequired: true,
  };
}
