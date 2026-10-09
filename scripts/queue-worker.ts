import "dotenv/config";
import { handleJob } from "../src/lib/queue/handlers";
import { dequeueJob, getJob, processNextJob } from "../src/lib/queue/queue";
import { nextSweepAt, runBillingSweep, sweepHourUtc } from "../src/lib/billing/billing-sweep";

const POLL_INTERVAL_MS = 1000;

/**
 * The daily billing sweep runs inside the worker: once at start-up (catching
 * up a sweep missed while it was down) and then every day at
 * BILLING_SWEEP_HOUR_UTC. Queueing and processing then happen in the same
 * process, which also works when no shared Redis queue is configured.
 */
let nextSweep: Date | null = process.env.BILLING_SWEEP_ENABLED === "false" ? null : new Date(0);

async function sweepIfDue(): Promise<void> {
  if (!nextSweep || Date.now() < nextSweep.getTime()) return;
  const now = new Date();
  nextSweep = nextSweepAt(now, sweepHourUtc());
  try {
    const { renewals, dunning } = await runBillingSweep(now);
    console.log(`[worker] billing sweep: ${renewals} renewal(s), ${dunning} dunning job(s); next at ${nextSweep.toISOString()}`);
  } catch (error) {
    console.error("[worker] billing sweep failed:", error instanceof Error ? error.message : error);
  }
}

async function runWorkerLoop(): Promise<void> {
  console.log("[worker] BizSim queue worker started");

  while (true) {
    await sweepIfDue();
    const processed = await processNextJob(handleJob);
    if (!processed) {
      await sleep(POLL_INTERVAL_MS);
    }
  }
}

async function runOnce(jobId?: string): Promise<void> {
  if (jobId) {
    const job = await getJob(jobId);
    if (!job) {
      console.error(`[worker] Job not found: ${jobId}`);
      process.exit(1);
    }
    await processNextJob(handleJob);
    return;
  }

  const id = await dequeueJob();
  if (!id) {
    console.log("[worker] Queue empty");
    return;
  }

  await processNextJob(handleJob);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const once = process.argv.includes("--once");
const jobIdArg = process.argv.find((arg) => arg.startsWith("--job="))?.split("=")[1];

if (once) {
  runOnce(jobIdArg)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("[worker] Failed:", error);
      process.exit(1);
    });
} else {
  runWorkerLoop().catch((error) => {
    console.error("[worker] Fatal error:", error);
    process.exit(1);
  });
}
