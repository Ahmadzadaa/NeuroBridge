import { describe, expect, it } from "vitest";
import {
  addMonths,
  daysRemainingInPeriod,
  isPeriodElapsed,
  monthlyPeriod,
  nextPeriod,
  periodLengthInDays,
} from "@/lib/billing/period";

const utc = (iso: string) => new Date(iso);

describe("addMonths", () => {
  it("advances by one month", () => {
    expect(addMonths(utc("2026-07-15T00:00:00Z"), 1).toISOString()).toBe(
      "2026-08-15T00:00:00.000Z"
    );
  });

  it("clamps the 31st to a 30-day month", () => {
    expect(addMonths(utc("2026-08-31T00:00:00Z"), 1).toISOString()).toBe(
      "2026-09-30T00:00:00.000Z"
    );
  });

  it("clamps the 31st to February", () => {
    expect(addMonths(utc("2026-01-31T00:00:00Z"), 1).toISOString()).toBe(
      "2026-02-28T00:00:00.000Z"
    );
  });

  it("handles a leap-year February", () => {
    expect(addMonths(utc("2028-01-31T00:00:00Z"), 1).toISOString()).toBe(
      "2028-02-29T00:00:00.000Z"
    );
  });

  it("rolls over the year boundary", () => {
    expect(addMonths(utc("2026-12-15T00:00:00Z"), 1).toISOString()).toBe(
      "2027-01-15T00:00:00.000Z"
    );
  });

  it("preserves the time of day", () => {
    expect(addMonths(utc("2026-07-15T13:45:30Z"), 1).toISOString()).toBe(
      "2026-08-15T13:45:30.000Z"
    );
  });
});

describe("monthlyPeriod", () => {
  it("spans exactly one month", () => {
    const period = monthlyPeriod(utc("2026-07-01T00:00:00Z"));
    expect(period.end.toISOString()).toBe("2026-08-01T00:00:00.000Z");
    expect(periodLengthInDays(period)).toBe(31);
  });

  it("reports 28 days for February", () => {
    expect(periodLengthInDays(monthlyPeriod(utc("2026-02-01T00:00:00Z")))).toBe(28);
  });
});

describe("nextPeriod", () => {
  it("starts exactly where the previous period ended", () => {
    const first = monthlyPeriod(utc("2026-07-01T00:00:00Z"));
    const second = nextPeriod(first);
    expect(second.start.toISOString()).toBe(first.end.toISOString());
  });

  it("leaves no gap across a clamped month end", () => {
    const first = monthlyPeriod(utc("2026-01-31T00:00:00Z"));
    const second = nextPeriod(first);
    expect(second.start.getTime()).toBe(first.end.getTime());
  });
});

describe("daysRemainingInPeriod", () => {
  const period = monthlyPeriod(utc("2026-07-01T00:00:00Z")); // 31 days

  it("returns the full period on day one", () => {
    expect(daysRemainingInPeriod(period, utc("2026-07-01T00:00:00Z"))).toBe(31);
  });

  it("returns the full period for a moment before it starts", () => {
    expect(daysRemainingInPeriod(period, utc("2026-06-20T00:00:00Z"))).toBe(31);
  });

  it("halves roughly at the midpoint", () => {
    expect(daysRemainingInPeriod(period, utc("2026-07-16T00:00:00Z"))).toBe(16);
  });

  it("returns 1 on the final day", () => {
    expect(daysRemainingInPeriod(period, utc("2026-07-31T00:00:00Z"))).toBe(1);
  });

  it("returns 0 exactly at the end", () => {
    expect(daysRemainingInPeriod(period, utc("2026-08-01T00:00:00Z"))).toBe(0);
  });

  it("returns 0 after the period has passed", () => {
    expect(daysRemainingInPeriod(period, utc("2026-09-01T00:00:00Z"))).toBe(0);
  });

  it("never exceeds the period length", () => {
    for (let day = 1; day <= 31; day++) {
      const now = utc(`2026-07-${String(day).padStart(2, "0")}T12:00:00Z`);
      const remaining = daysRemainingInPeriod(period, now);
      expect(remaining).toBeGreaterThanOrEqual(0);
      expect(remaining).toBeLessThanOrEqual(31);
    }
  });
});

describe("isPeriodElapsed", () => {
  const period = monthlyPeriod(utc("2026-07-01T00:00:00Z"));

  it("is false mid-period", () => {
    expect(isPeriodElapsed(period, utc("2026-07-15T00:00:00Z"))).toBe(false);
  });

  it("is true at the boundary", () => {
    expect(isPeriodElapsed(period, utc("2026-08-01T00:00:00Z"))).toBe(true);
  });
});
