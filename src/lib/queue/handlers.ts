import { exportProgramReportCsv } from "@/lib/reports/export-service";
import type { JobRecord, ReportExportPayload, ReportExportResult } from "@/lib/queue/types";

export async function handleJob(job: JobRecord): Promise<string> {
  switch (job.type) {
    case "REPORT_EXPORT":
      return handleReportExport(job);
    case "METRICS_ROLLUP":
      return JSON.stringify({ rolledUp: true });
    default:
      throw new Error(`Unknown job type: ${job.type}`);
  }
}

async function handleReportExport(job: JobRecord): Promise<string> {
  const payload = JSON.parse(job.payload) as ReportExportPayload;
  const report = await exportProgramReportCsv(payload.programId, payload.tenantId);

  const result: ReportExportResult = {
    filename: report.filename,
    content: report.content,
    rowCount: report.rowCount,
  };

  return JSON.stringify(result);
}
