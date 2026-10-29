import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  nextPeriodEnd,
  periodEndFromStart,
  defaultAllowanceCapUsdc,
  normalizeTrialDays,
  trialEndFromStart,
} from "./intervals";

describe("intervals", () => {
  it("adds one month for monthly interval", () => {
    const start = new Date("2026-01-15T00:00:00.000Z");
    const end = periodEndFromStart(start, "month");
    assert.equal(end.toISOString(), "2026-02-15T00:00:00.000Z");
  });

  it("adds one year for yearly interval", () => {
    const start = new Date("2026-03-01T00:00:00.000Z");
    const end = periodEndFromStart(start, "year");
    assert.equal(end.toISOString(), "2027-03-01T00:00:00.000Z");
  });

  it("computes next period from current end", () => {
    const end = new Date("2026-02-15T00:00:00.000Z");
    const next = nextPeriodEnd(end, "month");
    assert.equal(next.toISOString(), "2026-03-15T00:00:00.000Z");
  });

  it("defaults allowance cap to 3 periods", () => {
    assert.equal(defaultAllowanceCapUsdc(20, "month"), 60);
    assert.equal(defaultAllowanceCapUsdc(20, "year"), 60);
    assert.equal(defaultAllowanceCapUsdc(20, "week"), 60);
    assert.equal(defaultAllowanceCapUsdc(20, "five_minute"), 60);
  });

  it("rounds fractional caps to 6 USDC decimals", () => {
    // 0.1 * 3 is exact in IEEE float at 6 dp after roundUsdc
    assert.equal(defaultAllowanceCapUsdc(0.1, "month"), 0.3);
  });

  it("adds five minutes for test interval", () => {
    const start = new Date("2026-01-15T12:00:00.000Z");
    const end = periodEndFromStart(start, "five_minute");
    assert.equal(end.toISOString(), "2026-01-15T12:05:00.000Z");
  });

  it("adds one week for weekly interval", () => {
    const start = new Date("2026-01-15T00:00:00.000Z");
    const end = periodEndFromStart(start, "week");
    assert.equal(end.toISOString(), "2026-01-22T00:00:00.000Z");
  });

  it("trialEndFromStart adds whole days", () => {
    const start = new Date("2026-01-01T00:00:00.000Z");
    assert.equal(trialEndFromStart(start, 7).toISOString(), "2026-01-08T00:00:00.000Z");
    assert.equal(trialEndFromStart(start, 0).getTime(), start.getTime());
  });

  it("normalizeTrialDays floors and clamps", () => {
    assert.equal(normalizeTrialDays(7.9), 7);
    assert.equal(normalizeTrialDays(-1), 0);
    assert.equal(normalizeTrialDays("3"), 3);
  });
});
