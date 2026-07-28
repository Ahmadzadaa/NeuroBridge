import "dotenv/config";
import { enqueueDueRenewals } from "../src/lib/billing/renewal-service";
import { enqueueDueDunning } from "../src/lib/billing/dunning-service";

/**
 * Daily billing sweep.
 *
 * Enqueues one job per affected tenant and exits — it does no billing work
 * itself, so a slow or failing tenant cannot block the sweep. The jobs are
 * processed by `scripts/queue-worker.ts` in the worker process.
 *
 * Run once a day, e.g.
 *   0 6 * * *  npx tsx scripts/billing-cron.ts
 *
 * Safe to run more than once a day: renewal only picks up subscriptions whose
 * period has actually ended, and dunning only those whose retry is due.
 */
async function main(): Promise<void> {
  const now = new Date();
  console.log(`[billing-cron] sweep at ${now.toISOString()}`);

  const renewals = await enqueueDueRenewals(now);
  console.log(`[billing-cron] queued ${renewals} renewal job(s)`);

  const dunning = await enqueueDueDunning(now);
  console.log(`[billing-cron] queued ${dunning} dunning job(s)`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("[billing-cron] failed:", error);
    process.exit(1);
  });
