import { describe, expect, it, vi } from "vitest";
import { handleJob } from "@/lib/queue/handlers";
import type { JobRecord } from "@/lib/queue/types";

vi.mock("@/lib/reports/export-service", () => ({
  exportProgramReportCsv: vi.fn().mockResolvedValue({
    filename: "report.csv",
    content: "a,b",
    rowCount: 1,
  }),
}));

describe("queue handlers", () => {
  it("handles metrics rollup jobs", async () => {
    const job: JobRecord = {
      id: "1",
      type: "METRICS_ROLLUP",
      status: "PENDING",
      payload: "{}",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = await handleJob(job);
    expect(JSON.parse(result)).toEqual({ rolledUp: true });
  });

  it("handles report export jobs", async () => {
    const job: JobRecord = {
      id: "2",
      type: "REPORT_EXPORT",
      status: "PENDING",
      payload: JSON.stringify({ programId: "p1", tenantId: "t1" }),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = await handleJob(job);
    const parsed = JSON.parse(result);
    expect(parsed.filename).toBe("report.csv");
    expect(parsed.rowCount).toBe(1);
  });

  it("rejects unknown job types", async () => {
    const job: JobRecord = {
      id: "3",
      type: "UNKNOWN" as "REPORT_EXPORT",
      status: "PENDING",
      payload: "{}",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await expect(handleJob(job)).rejects.toThrow("Unknown job type");
  });
});
