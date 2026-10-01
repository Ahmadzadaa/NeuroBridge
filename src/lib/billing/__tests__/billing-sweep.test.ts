import { describe, expect, it } from "vitest";
import { nextSweepAt, sweepHourUtc } from "@/lib/billing/billing-sweep";

describe("billing sweep schedule", () => {
  it("runs today when the hour is still ahead, otherwise tomorrow", () => {
    expect(nextSweepAt(new Date("2026-10-01T04:30:00Z"), 6).toISOString()).toBe("2026-10-01T06:00:00.000Z");
    expect(nextSweepAt(new Date("2026-10-01T06:00:00Z"), 6).toISOString()).toBe("2026-10-02T06:00:00.000Z");
    expect(nextSweepAt(new Date("2026-12-31T23:59:00Z"), 6).toISOString()).toBe("2027-01-01T06:00:00.000Z");
  });

  it("reads the hour from the environment and ignores bad values", () => {
    expect(sweepHourUtc({})).toBe(6);
    expect(sweepHourUtc({ BILLING_SWEEP_HOUR_UTC: "2" })).toBe(2);
    expect(sweepHourUtc({ BILLING_SWEEP_HOUR_UTC: "25" })).toBe(6);
    expect(sweepHourUtc({ BILLING_SWEEP_HOUR_UTC: "abc" })).toBe(6);
  });
});
