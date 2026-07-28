export type JobType =
  | "REPORT_EXPORT"
  | "METRICS_ROLLUP"
  | "SUBSCRIPTION_RENEWAL"
  | "SUBSCRIPTION_DUNNING";

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

/**
 * One job per tenant, so a failure for one organisation cannot stall or
 * corrupt the renewal of any other.
 */
export interface SubscriptionJobPayload {
  tenantId: string;
  subscriptionId: string;
}
