import { withAuthorizedHandler } from "@/lib/auth/authorize";
import { getBusinessMetrics } from "@/lib/monitoring/metrics-service";

export async function GET() {
  return withAuthorizedHandler("platform:admin", async () => {
    return getBusinessMetrics();
  });
}
