import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isSubscriptionAccessExpired } from "./subscription-access.ts";

const past = new Date("2026-10-30T14:00:00.000Z");
const future = new Date("2026-10-30T20:00:00.000Z");
const now = new Date("2026-10-30T17:00:00.000Z").getTime();

describe("isSubscriptionAccessExpired", () => {
  it("keeps open trialing as not expired", () => {
    assert.equal(
      isSubscriptionAccessExpired(
        { status: "trialing", cancelAtPeriodEnd: false, currentPeriodEnd: future },
        now,
      ),
      false,
    );
  });

  it("marks trialing past currentPeriodEnd as expired (engine may still say trialing)", () => {
    assert.equal(
      isSubscriptionAccessExpired(
        { status: "trialing", cancelAtPeriodEnd: false, currentPeriodEnd: past },
        now,
      ),
      true,
    );
  });

  it("marks canceled past period end as expired", () => {
    assert.equal(
      isSubscriptionAccessExpired(
        { status: "canceled", cancelAtPeriodEnd: false, currentPeriodEnd: past },
        now,
      ),
      true,
    );
  });

  it("marks cancel-at-period-end past end as expired for active", () => {
    assert.equal(
      isSubscriptionAccessExpired(
        { status: "active", cancelAtPeriodEnd: true, currentPeriodEnd: past },
        now,
      ),
      true,
    );
  });

  it("does not mark active past period end without cancel (renewal may be due)", () => {
    assert.equal(
      isSubscriptionAccessExpired(
        { status: "active", cancelAtPeriodEnd: false, currentPeriodEnd: past },
        now,
      ),
      false,
    );
  });

  it("does not mark past_due past period end without cancel", () => {
    assert.equal(
      isSubscriptionAccessExpired(
        { status: "past_due", cancelAtPeriodEnd: false, currentPeriodEnd: past },
        now,
      ),
      false,
    );
  });

  it("never expires incomplete on period end alone", () => {
    assert.equal(
      isSubscriptionAccessExpired(
        { status: "incomplete", cancelAtPeriodEnd: false, currentPeriodEnd: past },
        now,
      ),
      false,
    );
  });
});
