/**
 * Billing period arithmetic.
 *
 * Periods are whole months anchored on the subscription start date. The
 * awkward case is a start date that does not exist in the next month
 * (e.g. 31 January): those clamp to the last day of the shorter month rather
 * than rolling into the following one, so a subscription started on the 31st
 * never silently drifts to the 1st or 3rd.
 */

export interface BillingPeriod {
  start: Date;
  end: Date;
}

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

/** Adds whole months, clamping the day to the target month's length. */
export function addMonths(date: Date, months: number): Date {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();

  const targetMonthIndex = month + months;
  const targetYear = year + Math.floor(targetMonthIndex / 12);
  const normalizedMonth = ((targetMonthIndex % 12) + 12) % 12;
  const clampedDay = Math.min(day, daysInMonth(targetYear, normalizedMonth));

  return new Date(
    Date.UTC(
      targetYear,
      normalizedMonth,
      clampedDay,
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
      date.getUTCMilliseconds()
    )
  );
}

/** The month-long period beginning at `start`. */
export function monthlyPeriod(start: Date): BillingPeriod {
  return { start, end: addMonths(start, 1) };
}

/** The period that follows `current`, with no gap between them. */
export function nextPeriod(current: BillingPeriod): BillingPeriod {
  return monthlyPeriod(current.end);
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Whole days in the period; always at least 1 so it is safe as a divisor. */
export function periodLengthInDays(period: BillingPeriod): number {
  const days = Math.round(
    (period.end.getTime() - period.start.getTime()) / MS_PER_DAY
  );
  return Math.max(1, days);
}

/**
 * Whole days left in the period from `now`, clamped to [0, length].
 * A moment before the period starts counts as the full period.
 */
export function daysRemainingInPeriod(period: BillingPeriod, now: Date): number {
  const length = periodLengthInDays(period);
  if (now <= period.start) return length;
  if (now >= period.end) return 0;

  const remaining = Math.ceil((period.end.getTime() - now.getTime()) / MS_PER_DAY);
  return Math.min(Math.max(remaining, 0), length);
}

export function isPeriodElapsed(period: BillingPeriod, now: Date): boolean {
  return now >= period.end;
}
