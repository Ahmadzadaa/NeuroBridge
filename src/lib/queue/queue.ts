import { randomUUID } from "crypto";
import {
  redisHgetall,
  redisHset,
  redisLpush,
  redisRpop,
} from "@/lib/redis/client";
import type { JobRecord, JobStatus, JobType } from "@/lib/queue/types";

const QUEUE_KEY = "bizsim:queue:jobs";
const JOB_PREFIX = "bizsim:job:";

function jobKey(id: string): string {
  return `${JOB_PREFIX}${id}`;
}

export async function enqueueJob(
  type: JobType,
  payload: unknown
): Promise<string> {
  const id = randomUUID();
  const now = new Date().toISOString();

  await redisHset(jobKey(id), {
    id,
    type,
    status: "PENDING",
    payload: JSON.stringify(payload),
    createdAt: now,
    updatedAt: now,
  });

  await redisLpush(QUEUE_KEY, id);
  return id;
}

export async function getJob(id: string): Promise<JobRecord | null> {
  const data = await redisHgetall(jobKey(id));
  if (!data.id) return null;

  return {
    id: data.id,
    type: data.type as JobType,
    status: data.status as JobStatus,
    payload: data.payload,
    result: data.result,
    error: data.error,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

export async function updateJobStatus(
  id: string,
  status: JobStatus,
  fields?: { result?: string; error?: string }
): Promise<void> {
  const existing = await getJob(id);
  if (!existing) return;

  await redisHset(jobKey(id), {
    id,
    type: existing.type,
    status,
    payload: existing.payload,
    result: fields?.result ?? existing.result ?? "",
    error: fields?.error ?? existing.error ?? "",
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  });
}

export async function dequeueJob(): Promise<string | null> {
  return redisRpop(QUEUE_KEY);
}

export async function processNextJob(
  handler: (job: JobRecord) => Promise<string>
): Promise<boolean> {
  const jobId = await dequeueJob();
  if (!jobId) return false;
  await processJob(jobId, handler);
  return true;
}

/** Runs one job by id; a job that is not PENDING (already taken) is left alone. */
export async function processJob(
  jobId: string,
  handler: (job: JobRecord) => Promise<string>
): Promise<void> {
  const job = await getJob(jobId);
  if (!job || job.status !== "PENDING") return;

  await updateJobStatus(jobId, "PROCESSING");

  try {
    const result = await handler(job);
    await updateJobStatus(jobId, "COMPLETED", { result });
  } catch (error) {
    await updateJobStatus(jobId, "FAILED", {
      error: error instanceof Error ? error.message : "Job failed",
    });
  }
}
