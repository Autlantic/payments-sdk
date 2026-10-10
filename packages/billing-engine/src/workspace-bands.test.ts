import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  WORKSPACE_FREE_OVERAGE_GRACE_DAYS,
  WORKSPACE_GROWTH_PRICE_USDC,
  WORKSPACE_LIVE_FREE_CHARGE_LIMIT,
  WORKSPACE_PLAN_REQUIRED_ERROR_CODE,
  countsTowardLiveSuccessfulCharges,
  isLiveFreeBandExceeded,
  isWorkspaceGrowthFeeMetadata,
  utcMonthKey,
  workspaceEntitlementFromState,
} from "./workspace-bands";

describe("workspace-bands constants", () => {
  it("locks Phase 1 product numbers and error code", () => {
    assert.equal(WORKSPACE_LIVE_FREE_CHARGE_LIMIT, 100);
    assert.equal(WORKSPACE_GROWTH_PRICE_USDC, 49);
    assert.equal(WORKSPACE_FREE_OVERAGE_GRACE_DAYS, 7);
    assert.equal(WORKSPACE_PLAN_REQUIRED_ERROR_CODE, "workspace_plan_required");
  });
});

describe("utcMonthKey", () => {
  it("formats UTC YYYY-MM", () => {
    assert.equal(utcMonthKey(new Date("2026-10-07T23:30:00.000Z")), "2026-10");
    assert.equal(utcMonthKey(new Date("2026-01-01T00:00:00.000Z")), "2026-01");
  });
});

describe("isLiveFreeBandExceeded", () => {
  it("is false at and below the limit", () => {
    assert.equal(isLiveFreeBandExceeded(0), false);
    assert.equal(isLiveFreeBandExceeded(100), false);
    assert.equal(isLiveFreeBandExceeded(100, 100), false);
  });

  it("is true only when count exceeds the limit", () => {
    assert.equal(isLiveFreeBandExceeded(101), true);
    assert.equal(isLiveFreeBandExceeded(101, 100), true);
    assert.equal(isLiveFreeBandExceeded(5, 4), true);
  });
});

describe("countsTowardLiveSuccessfulCharges", () => {
  it("counts Live paid events that are not Growth fees", () => {
    assert.equal(
      countsTowardLiveSuccessfulCharges({ mode: "live", isWorkspaceGrowthFee: false }),
      true,
    );
  });

  it("excludes Test mode entirely", () => {
    assert.equal(
      countsTowardLiveSuccessfulCharges({ mode: "test", isWorkspaceGrowthFee: false }),
      false,
    );
  });

  it("excludes Growth workspace fee invoices on Live", () => {
    assert.equal(
      countsTowardLiveSuccessfulCharges({ mode: "live", isWorkspaceGrowthFee: true }),
      false,
    );
  });
});

describe("isWorkspaceGrowthFeeMetadata", () => {
  it("detects Growth fee metadata", () => {
    assert.equal(isWorkspaceGrowthFeeMetadata({ autlanticWorkspaceFee: "growth" }), true);
    assert.equal(isWorkspaceGrowthFeeMetadata({ autlanticWorkspaceFee: "other" }), false);
    assert.equal(isWorkspaceGrowthFeeMetadata(null), false);
  });
});

describe("workspaceEntitlementFromState", () => {
  const now = new Date("2026-10-15T12:00:00.000Z");

  it("never enforces bands in Test mode", () => {
    const entitlement = workspaceEntitlementFromState({
      mode: "test",
      workspacePlan: "free",
      workspaceStatus: "none",
      workspacePeriodEnd: null,
      workspaceOverrideUntil: null,
      liveSuccessfulChargesThisMonth: 10_000,
      freeBandExceededAt: new Date("2026-10-01T00:00:00.000Z"),
      now,
    });
    assert.equal(entitlement.allowNewLiveCreates, true);
    assert.equal(entitlement.reason, "test_mode");
    assert.equal(entitlement.upgradeRequired, false);
  });

  it("allows Live creates within the free band", () => {
    const entitlement = workspaceEntitlementFromState({
      mode: "live",
      workspacePlan: "free",
      workspaceStatus: "none",
      workspacePeriodEnd: null,
      workspaceOverrideUntil: null,
      liveSuccessfulChargesThisMonth: 100,
      freeBandExceededAt: null,
      now,
    });
    assert.equal(entitlement.allowNewLiveCreates, true);
    assert.equal(entitlement.freeBandExceeded, false);
    assert.equal(entitlement.reason, "within_free_band");
  });

  it("allows soft overage for 7 days then blocks with workspace_plan_required", () => {
    const exceededAt = new Date("2026-10-10T00:00:00.000Z");
    const duringGrace = workspaceEntitlementFromState({
      mode: "live",
      workspacePlan: "free",
      workspaceStatus: "none",
      workspacePeriodEnd: null,
      workspaceOverrideUntil: null,
      liveSuccessfulChargesThisMonth: 101,
      freeBandExceededAt: exceededAt,
      now: new Date("2026-10-14T12:00:00.000Z"),
    });
    assert.equal(duringGrace.allowNewLiveCreates, true);
    assert.equal(duringGrace.inGracePeriod, true);
    assert.equal(duringGrace.reason, "grace_period");
    assert.equal(duringGrace.upgradeRequired, true);
    assert.ok(duringGrace.graceEndsAt);
    assert.equal(duringGrace.graceEndsAt!.toISOString(), "2026-10-17T00:00:00.000Z");

    const afterGrace = workspaceEntitlementFromState({
      mode: "live",
      workspacePlan: "free",
      workspaceStatus: "none",
      workspacePeriodEnd: null,
      workspaceOverrideUntil: null,
      liveSuccessfulChargesThisMonth: 101,
      freeBandExceededAt: exceededAt,
      now: new Date("2026-10-17T00:00:00.000Z"),
    });
    assert.equal(afterGrace.allowNewLiveCreates, false);
    assert.equal(afterGrace.inGracePeriod, false);
    assert.equal(afterGrace.reason, "workspace_plan_required");
    assert.equal(afterGrace.upgradeRequired, true);
  });

  it("allows Live creates when Growth is active", () => {
    const entitlement = workspaceEntitlementFromState({
      mode: "live",
      workspacePlan: "growth",
      workspaceStatus: "active",
      workspacePeriodEnd: new Date("2026-11-01T00:00:00.000Z"),
      workspaceOverrideUntil: null,
      liveSuccessfulChargesThisMonth: 500,
      freeBandExceededAt: new Date("2026-10-01T00:00:00.000Z"),
      now,
    });
    assert.equal(entitlement.allowNewLiveCreates, true);
    assert.equal(entitlement.reason, "growth_active");
    assert.equal(entitlement.upgradeRequired, false);
  });

  it("does not treat past_due Growth as entitled", () => {
    const entitlement = workspaceEntitlementFromState({
      mode: "live",
      workspacePlan: "growth",
      workspaceStatus: "past_due",
      workspacePeriodEnd: new Date("2026-11-01T00:00:00.000Z"),
      workspaceOverrideUntil: null,
      liveSuccessfulChargesThisMonth: 101,
      freeBandExceededAt: new Date("2026-09-01T00:00:00.000Z"),
      now,
    });
    assert.equal(entitlement.allowNewLiveCreates, false);
    assert.equal(entitlement.reason, "workspace_plan_required");
  });

  it("honors ops override even after grace", () => {
    const entitlement = workspaceEntitlementFromState({
      mode: "live",
      workspacePlan: "free",
      workspaceStatus: "none",
      workspacePeriodEnd: null,
      workspaceOverrideUntil: new Date("2026-10-20T00:00:00.000Z"),
      liveSuccessfulChargesThisMonth: 200,
      freeBandExceededAt: new Date("2026-09-01T00:00:00.000Z"),
      now,
    });
    assert.equal(entitlement.allowNewLiveCreates, true);
    assert.equal(entitlement.reason, "ops_override");
    assert.equal(entitlement.upgradeRequired, true);
  });
});
