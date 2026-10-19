import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  deferRetryAtFromOnChainPeriodEnd,
  isChargeNotDueFailure,
} from "./charge-not-due";

describe("isChargeNotDueFailure", () => {
  it("matches first-class CHARGE_NOT_DUE code", () => {
    assert.equal(isChargeNotDueFailure({ code: "CHARGE_NOT_DUE" }), true);
    assert.equal(isChargeNotDueFailure({ code: "charge_not_due", message: null }), true);
  });

  it("matches legacy RELAYER_ERROR message from preflight", () => {
    assert.equal(
      isChargeNotDueFailure({
        code: "RELAYER_ERROR",
        message: "On-chain billing period is not due yet",
      }),
      true,
    );
  });

  it("does not match real payment failures", () => {
    assert.equal(
      isChargeNotDueFailure({
        code: "INSUFFICIENT_BALANCE",
        message: "Wallet has insufficient USDC for this charge",
      }),
      false,
    );
    assert.equal(
      isChargeNotDueFailure({
        code: "RELAYER_ERROR",
        message: "Missing on-chain subscription id",
      }),
      false,
    );
  });
});

describe("deferRetryAtFromOnChainPeriodEnd", () => {
  it("schedules at periodEnd + buffer when that is in the future", () => {
    const nowMs = Date.parse("2026-10-19T18:00:00.000Z");
    const periodEndUnix = Math.floor(nowMs / 1000) + 120;
    const retryAt = deferRetryAtFromOnChainPeriodEnd(periodEndUnix, {
      nowMs,
      bufferSec: 30,
      minAheadSec: 15,
    });
    assert.equal(retryAt.toISOString(), "2026-10-19T18:02:30.000Z");
  });

  it("floors to minAhead when periodEnd already passed", () => {
    const nowMs = Date.parse("2026-10-19T18:00:00.000Z");
    const periodEndUnix = Math.floor(nowMs / 1000) - 10;
    const retryAt = deferRetryAtFromOnChainPeriodEnd(periodEndUnix, {
      nowMs,
      bufferSec: 0,
      minAheadSec: 15,
    });
    assert.equal(retryAt.toISOString(), "2026-10-19T18:00:15.000Z");
  });
});
