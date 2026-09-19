import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { nextPeriodEnd, periodEndFromStart, defaultAllowanceCapUsdc } from "./intervals";

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

  it("defaults allowance cap to 12 months", () => {
    assert.equal(defaultAllowanceCapUsdc(20, "month"), 240);
  });

  it("rounds fractional caps to 6 USDC decimals", () => {
    // 0.1 * 12 is 1.2000000000000002 in IEEE float; cap must be exact 1.2
    assert.equal(defaultAllowanceCapUsdc(0.1, "month"), 1.2);
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
});
