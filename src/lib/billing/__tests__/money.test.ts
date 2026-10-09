import { describe, expect, it } from "vitest";
import {
  assertKurus,
  daysBetween,
  formatKurus,
  prorate,
  roundKurus,
  seatSubtotal,
  toKurus,
  toMajorUnits,
} from "@/lib/billing/money";

describe("kuruş conversion", () => {
  it("converts major units to kuruş", () => {
    expect(toKurus(25)).toBe(2500);
    expect(toKurus(25.5)).toBe(2550);
  });

  it("rounds half-kuruş amounts to the nearest kuruş", () => {
    expect(toKurus(0.005)).toBe(1);
    expect(toKurus(0.004)).toBe(0);
  });

  it("survives the classic float representation error", () => {
    // 0.1 + 0.2 === 0.30000000000000004
    expect(toKurus(0.1 + 0.2)).toBe(30);
  });

  it("converts back to major units", () => {
    expect(toMajorUnits(2550)).toBe(25.5);
  });

  it("rejects non-integer kuruş", () => {
    expect(() => assertKurus(10.5)).toThrow(/integer amount of kuruş/);
  });

  it("rejects negative kuruş", () => {
    expect(() => assertKurus(-1)).toThrow(/must not be negative/);
  });

  it("rejects non-finite input when rounding", () => {
    expect(() => roundKurus(Number.NaN)).toThrow(/non-finite/);
    expect(() => roundKurus(Number.POSITIVE_INFINITY)).toThrow(/non-finite/);
  });

  it("formats kuruş as Turkish lira", () => {
    // Intl uses a non-breaking space, so compare on the digits only.
    expect(formatKurus(2550).replace(/\s/g, " ")).toContain("25,50");
  });
});

describe("seatSubtotal", () => {
  it("multiplies price by seats", () => {
    expect(seatSubtotal(2500, 40)).toBe(100000);
  });

  it("is zero for zero seats", () => {
    expect(seatSubtotal(2500, 0)).toBe(0);
  });

  it("rejects fractional seats", () => {
    expect(() => seatSubtotal(2500, 1.5)).toThrow(/non-negative integer/);
  });
});

describe("prorate", () => {
  const base = { pricePerSeatKurus: 3000, addedSeats: 10, daysInPeriod: 30 };

  it("charges the full amount when the whole period remains", () => {
    expect(prorate({ ...base, daysRemaining: 30 })).toBe(30000);
  });

  it("charges half for half a period", () => {
    expect(prorate({ ...base, daysRemaining: 15 })).toBe(15000);
  });

  it("charges nothing when the period has ended", () => {
    expect(prorate({ ...base, daysRemaining: 0 })).toBe(0);
  });

  it("charges a single day at 1/30th, rounded", () => {
    // 3000 × 10 × 1/30 = 1000
    expect(prorate({ ...base, daysRemaining: 1 })).toBe(1000);
  });

  it("rounds to whole kuruş rather than leaving a fraction", () => {
    // 2999 × 1 × 1/30 = 99.966... -> 100
    const result = prorate({
      pricePerSeatKurus: 2999,
      addedSeats: 1,
      daysRemaining: 1,
      daysInPeriod: 30,
    });
    expect(result).toBe(100);
    expect(Number.isInteger(result)).toBe(true);
  });

  it("never charges more than a full period", () => {
    expect(prorate({ ...base, daysRemaining: 45 })).toBe(30000);
  });

  it("charges nothing when no seats are added", () => {
    expect(prorate({ ...base, addedSeats: 0, daysRemaining: 30 })).toBe(0);
  });

  it("rejects a zero-length period", () => {
    expect(() => prorate({ ...base, daysRemaining: 1, daysInPeriod: 0 })).toThrow(
      /positive integer/
    );
  });

  it("rejects negative days remaining", () => {
    expect(() => prorate({ ...base, daysRemaining: -1 })).toThrow(
      /non-negative integer/
    );
  });

  it("always returns an integer for awkward ratios", () => {
    for (let day = 0; day <= 31; day++) {
      const value = prorate({
        pricePerSeatKurus: 1733,
        addedSeats: 7,
        daysRemaining: day,
        daysInPeriod: 31,
      });
      expect(Number.isInteger(value)).toBe(true);
    }
  });
});

describe("daysBetween", () => {
  it("counts whole days forward", () => {
    expect(
      daysBetween(new Date("2026-07-01T00:00:00Z"), new Date("2026-07-31T00:00:00Z"))
    ).toBe(30);
  });

  it("is zero for the same instant", () => {
    const now = new Date("2026-07-01T00:00:00Z");
    expect(daysBetween(now, now)).toBe(0);
  });

  it("is zero when the end is in the past", () => {
    expect(
      daysBetween(new Date("2026-07-31T00:00:00Z"), new Date("2026-07-01T00:00:00Z"))
    ).toBe(0);
  });

  it("rounds a partial day up to a whole day", () => {
    expect(
      daysBetween(new Date("2026-07-01T00:00:00Z"), new Date("2026-07-01T06:00:00Z"))
    ).toBe(1);
  });
});
