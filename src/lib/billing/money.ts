/**
 * Money handling for billing.
 *
 * Every amount in the billing module is an INTEGER number of kuruş
 * (1 TRY = 100 kuruş). Floating point is never used to represent or carry
 * money — it is only ever an intermediate value inside these helpers, and
 * every rounding decision funnels through `roundKurus`.
 */

export const KURUS_PER_UNIT = 100;

/** The single rounding rule for the whole billing module. */
export function roundKurus(value: number): number {
  if (!Number.isFinite(value)) {
    throw new RangeError(`Cannot round a non-finite amount: ${value}`);
  }
  return Math.round(value);
}

export function assertKurus(amount: number, label = "amount"): number {
  if (!Number.isInteger(amount)) {
    throw new RangeError(`${label} must be an integer amount of kuruş, got ${amount}`);
  }
  if (amount < 0) {
    throw new RangeError(`${label} must not be negative, got ${amount}`);
  }
  return amount;
}

/** 25.5 TRY -> 2550 kuruş. Use only at the edges (config, admin input). */
export function toKurus(majorUnits: number): number {
  return roundKurus(majorUnits * KURUS_PER_UNIT);
}

/** 2550 kuruş -> 25.5 TRY. Use only for display and provider payloads. */
export function toMajorUnits(kurus: number): number {
  return assertKurus(kurus) / KURUS_PER_UNIT;
}

/** Formats kuruş for humans, e.g. 2550 -> "25,50 ₺" in tr-TR. */
export function formatKurus(
  kurus: number,
  currency = "TRY",
  locale = "tr-TR"
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(toMajorUnits(kurus));
}

export function seatSubtotal(pricePerSeatKurus: number, seats: number): number {
  assertKurus(pricePerSeatKurus, "pricePerSeat");
  if (!Number.isInteger(seats) || seats < 0) {
    throw new RangeError(`seats must be a non-negative integer, got ${seats}`);
  }
  return pricePerSeatKurus * seats;
}

export interface ProrationInput {
  pricePerSeatKurus: number;
  addedSeats: number;
  /** Whole days left in the current period, clamped to [0, daysInPeriod]. */
  daysRemaining: number;
  daysInPeriod: number;
}

/**
 * Charge for seats added mid-period:
 *
 *   price × addedSeats × (daysRemaining / daysInPeriod)
 *
 * Boundary behaviour: a full period charges in full, and zero days remaining
 * charges nothing.
 */
export function prorate(input: ProrationInput): number {
  const { pricePerSeatKurus, addedSeats, daysRemaining, daysInPeriod } = input;

  assertKurus(pricePerSeatKurus, "pricePerSeat");

  if (!Number.isInteger(addedSeats) || addedSeats < 0) {
    throw new RangeError(`addedSeats must be a non-negative integer, got ${addedSeats}`);
  }
  if (!Number.isInteger(daysInPeriod) || daysInPeriod <= 0) {
    throw new RangeError(`daysInPeriod must be a positive integer, got ${daysInPeriod}`);
  }
  if (!Number.isInteger(daysRemaining) || daysRemaining < 0) {
    throw new RangeError(`daysRemaining must be a non-negative integer, got ${daysRemaining}`);
  }

  const cappedDays = Math.min(daysRemaining, daysInPeriod);
  if (addedSeats === 0 || cappedDays === 0) return 0;

  return roundKurus((pricePerSeatKurus * addedSeats * cappedDays) / daysInPeriod);
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Whole days between two instants, never negative. */
export function daysBetween(from: Date, to: Date): number {
  const diff = to.getTime() - from.getTime();
  if (diff <= 0) return 0;
  return Math.ceil(diff / MS_PER_DAY);
}
