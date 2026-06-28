import "dotenv/config";
import { handleJob } from "../src/lib/queue/handlers";
import { dequeueJob, getJob, processNextJob } from "../src/lib/queue/queue";

const POLL_INTERVAL_MS = 1000;

async function runWorkerLoop(): Promise<void> {
  console.log("[worker] BizSim queue worker started");

  while (true) {
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
