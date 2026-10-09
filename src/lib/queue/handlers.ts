import { exportProgramReportCsv } from "@/lib/reports/export-service";
import { renewSubscription } from "@/lib/billing/renewal-service";
import { processDunning } from "@/lib/billing/dunning-service";
import type {
  JobRecord,
  ReportExportPayload,
  ReportExportResult,
  SubscriptionJobPayload,
} from "@/lib/queue/types";

export async function handleJob(job: JobRecord): Promise<string> {
  switch (job.type) {
    case "REPORT_EXPORT":
      return handleReportExport(job);
    case "METRICS_ROLLUP":
      return JSON.stringify({ rolledUp: true });
    case "SUBSCRIPTION_RENEWAL":
      return handleSubscriptionRenewal(job);
    case "SUBSCRIPTION_DUNNING":
      return handleSubscriptionDunning(job);
    default:
      throw new Error(`Unknown job type: ${job.type}`);
  }
}

async function handleSubscriptionRenewal(job: JobRecord): Promise<string> {
  const payload = JSON.parse(job.payload) as SubscriptionJobPayload;
  return JSON.stringify(await renewSubscription(payload.tenantId));
}

async function handleSubscriptionDunning(job: JobRecord): Promise<string> {
  const payload = JSON.parse(job.payload) as SubscriptionJobPayload;
  return JSON.stringify(await processDunning(payload.tenantId));
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
