import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  assertValidIntervalCount,
  intervalPeriodSeconds,
  nextPeriodEnd,
  normalizeIntervalCount,
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

  it("adds three months when intervalCount is 3", () => {
    const start = new Date("2026-01-15T00:00:00.000Z");
    const end = periodEndFromStart(start, "month", 3);
    assert.equal(end.toISOString(), "2026-04-15T00:00:00.000Z");
  });

  it("adds two weeks when intervalCount is 2", () => {
    const start = new Date("2026-01-15T00:00:00.000Z");
    const end = periodEndFromStart(start, "week", 2);
    assert.equal(end.toISOString(), "2026-01-29T00:00:00.000Z");
  });

  it("advances nextPeriodEnd by intervalCount", () => {
    const end = new Date("2026-01-15T00:00:00.000Z");
    const next = nextPeriodEnd(end, "month", 3);
    assert.equal(next.toISOString(), "2026-04-15T00:00:00.000Z");
  });

  it("scales vault periodDurationSeconds by intervalCount", () => {
    assert.equal(intervalPeriodSeconds("week", 1), 7 * 24 * 60 * 60);
    assert.equal(intervalPeriodSeconds("week", 2), 14 * 24 * 60 * 60);
    assert.equal(intervalPeriodSeconds("month", 3), 90 * 24 * 60 * 60);
    assert.equal(intervalPeriodSeconds("year", 1), 365 * 24 * 60 * 60);
  });

  it("rejects year with intervalCount other than 1", () => {
    assert.throws(() => periodEndFromStart(new Date(), "year", 2), /intervalCount must be 1/);
    assert.throws(() => assertValidIntervalCount("year", 2), /intervalCount must be 1/);
  });

  it("rejects week/month intervalCount above 12", () => {
    assert.throws(() => assertValidIntervalCount("month", 13), /between 1 and 12/);
    assert.throws(() => assertValidIntervalCount("week", 0), /positive integer/);
  });

  it("normalizeIntervalCount defaults invalid to 1", () => {
    assert.equal(normalizeIntervalCount(undefined), 1);
    assert.equal(normalizeIntervalCount(2.9), 2);
    assert.equal(normalizeIntervalCount(-1), 1);
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
