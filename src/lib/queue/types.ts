export type JobType = "REPORT_EXPORT" | "METRICS_ROLLUP";

export type JobStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

export interface JobRecord {
  id: string;
  type: JobType;
  status: JobStatus;
  payload: string;
  result?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReportExportPayload {
  programId: string;
  tenantId: string;
  userId: string;
  format: "csv" | "pdf";
  reportType: string;
}

export interface ReportExportResult {
  filename: string;
  content: string;
  rowCount: number;
}
