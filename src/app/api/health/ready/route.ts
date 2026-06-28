import { getReadinessStatus } from "@/lib/monitoring/health";

export async function GET() {
  const status = await getReadinessStatus();
  return Response.json(status, { status: status.status === "ok" ? 200 : 503 });
}
