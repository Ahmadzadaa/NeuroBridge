/** Pure date helpers for the analytics window. Kept separate so they are testable without a database. */

export const DEFAULT_RANGE_DAYS = 90;
export const TIME_SERIES_WEEKS = 12;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface ResolvedRange {
  from: Date;
  to: Date;
  defaulted: boolean;
}

/**
 * Resolves the requested window.
 *
 * A caller that sends neither bound gets the last 90 days rather than the
 * whole history: an unbounded scan is the thing this dashboard must not do by
 * default. A reversed pair is swapped rather than rejected — the UI can hand
 * over two dates in either order and still get a sensible answer.
 */
export function resolveRange(from?: Date, to?: Date, now: Date = new Date()): ResolvedRange {
  if (!from && !to) {
    return { from: new Date(now.getTime() - DEFAULT_RANGE_DAYS * DAY_MS), to: now, defaulted: true };
  }

  const start = from ?? new Date((to ?? now).getTime() - DEFAULT_RANGE_DAYS * DAY_MS);
  const end = to ?? now;

  return start > end
    ? { from: end, to: start, defaulted: false }
    : { from: start, to: end, defaulted: false };
}

/** Monday 00:00 UTC of the week containing `date`. */
export function startOfWeek(date: Date): Date {
  const d = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  // getUTCDay(): 0 = Sunday, so Sunday belongs to the week that began 6 days back.
  const shift = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - shift);
  return d;
}

/**
 * The `TIME_SERIES_WEEKS` week-start dates ending with the week containing
 * `to`, oldest first. Weeks with no activity must still appear — a gap in a
 * line chart reads as missing data rather than as a quiet week.
 */
export function weekBuckets(to: Date, weeks: number = TIME_SERIES_WEEKS): Date[] {
  const last = startOfWeek(to);
  return Array.from({ length: weeks }, (_, i) => {
    const d = new Date(last);
    d.setUTCDate(d.getUTCDate() - (weeks - 1 - i) * 7);
    return d;
  });
}

/** Whole days between two instants, rounded to one decimal. */
export function daysBetween(first: Date, last: Date): number {
  return Math.round((Math.abs(last.getTime() - first.getTime()) / DAY_MS) * 10) / 10;
}

export function daysAgo(days: number, now: Date = new Date()): Date {
  return new Date(now.getTime() - days * DAY_MS);
}
