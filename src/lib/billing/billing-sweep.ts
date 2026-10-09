import { enqueueDueRenewals } from "@/lib/billing/renewal-service";
import { enqueueDueDunning } from "@/lib/billing/dunning-service";

/**
 * The daily billing sweep: queues one renewal job per subscription whose
 * period has ended and one dunning job per retry that is due. Safe to run more
 * than once: a renewal whose period has already moved on is skipped.
 */
export async function runBillingSweep(now = new Date()): Promise<{ renewals: number; dunning: number }> {
  const renewals = await enqueueDueRenewals(now);
  const dunning = await enqueueDueDunning(now);
  return { renewals, dunning };
}

/** The next sweep time: today at `hourUtc` if that is still ahead, otherwise tomorrow. */
export function nextSweepAt(now: Date, hourUtc: number): Date {
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hourUtc));
  return today > now ? today : new Date(today.getTime() + 24 * 60 * 60 * 1000);
}

export function sweepHourUtc(env: Record<string, string | undefined> = process.env): number {
  const hour = Number(env.BILLING_SWEEP_HOUR_UTC ?? 6);
  return Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : 6;
}
