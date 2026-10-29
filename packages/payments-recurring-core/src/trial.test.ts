import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeTrialDays, trialEndFromStart } from "./intervals.js";

describe("trialEndFromStart", () => {
  it("adds whole days", () => {
    const start = new Date("2026-01-01T00:00:00.000Z");
    const end = trialEndFromStart(start, 7);
    assert.equal(end.toISOString(), "2026-01-08T00:00:00.000Z");
  });

  it("returns start when trialDays is 0 or invalid", () => {
    const start = new Date("2026-01-01T00:00:00.000Z");
    assert.equal(trialEndFromStart(start, 0).getTime(), start.getTime());
    assert.equal(trialEndFromStart(start, -3).getTime(), start.getTime());
    assert.equal(trialEndFromStart(start, Number.NaN).getTime(), start.getTime());
  });
});

describe("normalizeTrialDays", () => {
  it("floors and clamps", () => {
    assert.equal(normalizeTrialDays(7), 7);
    assert.equal(normalizeTrialDays(7.9), 7);
    assert.equal(normalizeTrialDays(0), 0);
    assert.equal(normalizeTrialDays(-1), 0);
    assert.equal(normalizeTrialDays("3"), 3);
    assert.equal(normalizeTrialDays(undefined), 0);
  });
});
