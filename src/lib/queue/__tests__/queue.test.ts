import { beforeEach, describe, expect, it } from "vitest";
import {
  dequeueJob,
  enqueueJob,
  getJob,
  processJob,
  processNextJob,
  updateJobStatus,
} from "@/lib/queue/queue";
import { handleJob } from "@/lib/queue/handlers";
import { resetRedisMemoryForTests } from "@/lib/redis/client";

describe("queue", () => {
  beforeEach(() => {
    resetRedisMemoryForTests();
  });

  it("enqueues and retrieves jobs", async () => {
    const jobId = await enqueueJob("REPORT_EXPORT", { programId: "p1" });
    const job = await getJob(jobId);

    expect(job).not.toBeNull();
    expect(job?.status).toBe("PENDING");
    expect(job?.type).toBe("REPORT_EXPORT");
    expect(JSON.parse(job!.payload)).toEqual({ programId: "p1" });
  });

  it("updates job status with result", async () => {
    const jobId = await enqueueJob("METRICS_ROLLUP", {});
    await updateJobStatus(jobId, "COMPLETED", { result: JSON.stringify({ ok: true }) });

    const job = await getJob(jobId);
    expect(job?.status).toBe("COMPLETED");
    expect(job?.result).toContain("ok");
  });

  it("dequeues jobs in FIFO order", async () => {
    const first = await enqueueJob("METRICS_ROLLUP", { n: 1 });
    const second = await enqueueJob("METRICS_ROLLUP", { n: 2 });

    expect(await dequeueJob()).toBe(first);
    expect(await dequeueJob()).toBe(second);
    expect(await dequeueJob()).toBeNull();
  });

  it("processes jobs through handler", async () => {
    const jobId = await enqueueJob("METRICS_ROLLUP", {});
    const processed = await processNextJob(handleJob);
    expect(processed).toBe(true);

    const job = await getJob(jobId);
    expect(job?.status).toBe("COMPLETED");
  });

  it("runs a job by id once, without the worker", async () => {
    const jobId = await enqueueJob("METRICS_ROLLUP", {});
    let runs = 0;
    const handler = async () => {
      runs++;
      return "{}";
    };
    await processJob(jobId, handler);
    await processJob(jobId, handler);

    expect((await getJob(jobId))?.status).toBe("COMPLETED");
    expect(runs).toBe(1);
  });

  it("marks failed jobs when handler throws", async () => {
    const jobId = await enqueueJob("REPORT_EXPORT", { programId: "missing" });
    await processNextJob(async () => {
      throw new Error("handler failed");
    });

    const job = await getJob(jobId);
    expect(job?.status).toBe("FAILED");
    expect(job?.error).toContain("handler failed");
  });
});
