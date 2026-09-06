import { describe, expect, it } from "vitest";
import {
  DEFAULT_RANGE_DAYS,
  TIME_SERIES_WEEKS,
  daysBetween,
  resolveRange,
  startOfWeek,
  weekBuckets,
} from "@/lib/analytics/range";
import { analyticsFingerprint } from "@/lib/analytics/fingerprint";

const NOW = new Date("2026-09-05T12:00:00.000Z"); // a Saturday

describe("resolveRange", () => {
  it("defaults to the last 90 days rather than the whole history", () => {
    const range = resolveRange(undefined, undefined, NOW);

    expect(range.defaulted).toBe(true);
    expect(range.to).toEqual(NOW);
    expect(daysBetween(range.from, range.to)).toBe(DEFAULT_RANGE_DAYS);
  });

  it("keeps an explicit window and does not mark it defaulted", () => {
    const from = new Date("2026-01-01T00:00:00.000Z");
    const to = new Date("2026-02-01T00:00:00.000Z");

    expect(resolveRange(from, to, NOW)).toEqual({ from, to, defaulted: false });
  });

  // The UI hands over two date inputs; a user can fill them in either order.
  it("swaps a reversed pair instead of returning an empty window", () => {
    const from = new Date("2026-02-01T00:00:00.000Z");
    const to = new Date("2026-01-01T00:00:00.000Z");

    const range = resolveRange(from, to, NOW);

    expect(range.from).toEqual(to);
    expect(range.to).toEqual(from);
  });

  it("derives the missing bound from the one that was given", () => {
    const to = new Date("2026-06-01T00:00:00.000Z");
    const range = resolveRange(undefined, to, NOW);

    expect(range.to).toEqual(to);
    expect(daysBetween(range.from, to)).toBe(DEFAULT_RANGE_DAYS);
  });
});

describe("startOfWeek", () => {
  it("returns the Monday of the containing week", () => {
    expect(startOfWeek(new Date("2026-09-05T23:59:00.000Z")).toISOString()).toBe(
      "2026-08-31T00:00:00.000Z",
    );
  });

  // Sunday is the end of its week, not the start of the next one.
  it("puts Sunday in the week that began six days earlier", () => {
    expect(startOfWeek(new Date("2026-09-06T10:00:00.000Z")).toISOString()).toBe(
      "2026-08-31T00:00:00.000Z",
    );
  });

  it("is idempotent", () => {
    const monday = startOfWeek(NOW);
    expect(startOfWeek(monday)).toEqual(monday);
  });
});

describe("weekBuckets", () => {
  it("returns twelve consecutive Mondays ending with the current week", () => {
    const buckets = weekBuckets(NOW);

    expect(buckets).toHaveLength(TIME_SERIES_WEEKS);
    expect(buckets[TIME_SERIES_WEEKS - 1]).toEqual(startOfWeek(NOW));

    for (let i = 1; i < buckets.length; i++) {
      const gap = buckets[i].getTime() - buckets[i - 1].getTime();
      expect(gap).toBe(7 * 24 * 60 * 60 * 1000);
    }
  });
});

describe("analyticsFingerprint", () => {
  it("gives the same key for the same filters", () => {
    const input = { courseId: "c1", programId: "p1", locale: "az" };
    expect(analyticsFingerprint(input)).toBe(analyticsFingerprint(input));
  });

  // Two admins on different filters must never share a cache entry.
  it.each([
    ["course", { courseId: "c2" }],
    ["programme", { programId: "p2" }],
    ["locale", { locale: "en" }],
    ["from", { from: new Date("2026-01-01") }],
    ["to", { to: new Date("2026-01-01") }],
  ])("changes when the %s changes", (_label, override) => {
    const base = { courseId: "c1", programId: "p1", locale: "az" };
    expect(analyticsFingerprint({ ...base, ...override })).not.toBe(
      analyticsFingerprint(base),
    );
  });

  it("treats an absent window as one stable key", () => {
    expect(analyticsFingerprint({})).toBe(analyticsFingerprint({}));
  });
});
