import {
  CloudWatchClient,
  PutMetricDataCommand,
  type MetricDatum,
  type StandardUnit,
} from "@aws-sdk/client-cloudwatch";
import { AUDIT_ACTIONS, METRIC_NAMES } from "@/lib/audit/actions";

let cloudWatchClient: CloudWatchClient | null = null;

function getCloudWatchClient(): CloudWatchClient | null {
  if (!process.env.AWS_REGION) return null;
  if (!cloudWatchClient) {
    cloudWatchClient = new CloudWatchClient({
      region: process.env.AWS_REGION,
    });
  }
  return cloudWatchClient;
}

function isCloudWatchEnabled(): boolean {
  return Boolean(process.env.AWS_REGION && process.env.CLOUDWATCH_NAMESPACE);
}

export async function putMetric(
  name: string,
  value: number,
  unit: StandardUnit = "Count",
  dimensions?: Record<string, string>
): Promise<void> {
  if (!isCloudWatchEnabled()) return;

  const client = getCloudWatchClient();
  if (!client) return;

  const metric: MetricDatum = {
    MetricName: name,
    Value: value,
    Unit: unit,
    Timestamp: new Date(),
    Dimensions: dimensions
      ? Object.entries(dimensions).map(([Name, Value]) => ({ Name, Value }))
      : undefined,
  };

  try {
    await client.send(
      new PutMetricDataCommand({
        Namespace: process.env.CLOUDWATCH_NAMESPACE!,
        MetricData: [metric],
      })
    );
  } catch (error) {
    console.error("CloudWatch PutMetricData failed:", error);
  }
}

export async function emitBusinessMetric(
  auditAction: string,
  tenantId?: string
): Promise<void> {
  const dimensions = tenantId ? { TenantId: tenantId } : undefined;

  switch (auditAction) {
    case AUDIT_ACTIONS.PARTICIPANT_REGISTERED:
    case AUDIT_ACTIONS.USER_CREATED:
      await putMetric(METRIC_NAMES.REGISTRATION_RATE, 1, "Count", dimensions);
      break;
    case AUDIT_ACTIONS.PAYMENT_FAILED:
      await putMetric(METRIC_NAMES.PAYMENT_FAILURES, 1, "Count", dimensions);
      break;
    case AUDIT_ACTIONS.AI_CHAT_USED:
      await putMetric(METRIC_NAMES.AI_USAGE, 1, "Count", dimensions);
      break;
    default:
      break;
  }
}

export async function emitSeatUtilizationMetric(
  utilizationPercent: number,
  tenantId?: string
): Promise<void> {
  await putMetric(
    METRIC_NAMES.SEAT_UTILIZATION,
    utilizationPercent,
    "Percent",
    tenantId ? { TenantId: tenantId } : undefined
  );
}
