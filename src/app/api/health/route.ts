import { getLivenessStatus } from "@/lib/monitoring/health";

export async function GET() {
  return Response.json(getLivenessStatus());
}
