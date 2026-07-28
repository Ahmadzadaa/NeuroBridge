import { describe, expect, it } from "vitest";
import {
  EXPIRE_AFTER_DAYS,
  RETRY_DAYS,
  expiryDeadline,
  nextRetryAfter,
} from "@/lib/billing/dunning-service";

const FAILED_AT = new Date("2026-07-01T09:00:00Z");
const day = (n: number) =>
  new Date(FAILED_AT.getTime() + n * 24 * 60 * 60 * 1000).toISOString();

describe("dunning schedule", () => {
  it("retries on days 1, 3 and 5", () => {
    expect(RETRY_DAYS).toEqual([1, 3, 5]);
  });

  it("schedules the first retry one day after the failure", () => {
    expect(nextRetryAfter(FAILED_AT, 0)?.toISOString()).toBe(day(1));
  });

  it("schedules the second retry on day 3", () => {
    expect(nextRetryAfter(FAILED_AT, 1)?.toISOString()).toBe(day(3));
  });

  it("schedules the third retry on day 5", () => {
    expect(nextRetryAfter(FAILED_AT, 2)?.toISOString()).toBe(day(5));
  });

  it("stops scheduling once the three retries are used up", () => {
    expect(nextRetryAfter(FAILED_AT, 3)).toBeNull();
    expect(nextRetryAfter(FAILED_AT, 10)).toBeNull();
  });

  it("expires seven days after the first failure", () => {
    expect(EXPIRE_AFTER_DAYS).toBe(7);
    expect(expiryDeadline(FAILED_AT).toISOString()).toBe(day(7));
  });

  it("keeps every retry strictly before the expiry deadline", () => {
    const deadline = expiryDeadline(FAILED_AT);
    for (let attempt = 0; attempt < RETRY_DAYS.length; attempt++) {
      const retry = nextRetryAfter(FAILED_AT, attempt);
      expect(retry).not.toBeNull();
      expect(retry!.getTime()).toBeLessThan(deadline.getTime());
    }
  });

  it("produces a strictly increasing schedule", () => {
    const times = RETRY_DAYS.map((_, i) => nextRetryAfter(FAILED_AT, i)!.getTime());
    for (let i = 1; i < times.length; i++) {
      expect(times[i]).toBeGreaterThan(times[i - 1]);
    }
  });

  it("preserves the time of day across retries", () => {
    for (let attempt = 0; attempt < RETRY_DAYS.length; attempt++) {
      expect(nextRetryAfter(FAILED_AT, attempt)!.getUTCHours()).toBe(9);
    }
  });
});
