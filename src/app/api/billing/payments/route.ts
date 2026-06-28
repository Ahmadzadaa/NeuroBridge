import { NextResponse } from "next/server";
import { withAuthorizedHandler } from "@/lib/auth/authorize";
import { parsePagination } from "@/lib/pagination";
import { listTenantPaymentsPaginated } from "@/lib/payment/payment-service";
import { enforceRateLimit, getClientIdentifier } from "@/lib/security/rate-limit";

export async function GET(request: Request) {
  try {
    await enforceRateLimit("api", getClientIdentifier(request));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Rate limited" },
      { status: 429 }
    );
  }

  const pagination = parsePagination(new URL(request.url).searchParams);

  return withAuthorizedHandler(
    "billing:read",
    async ({ session }) => {
      if (!session.tenantId) {
        return NextResponse.json({ error: "Tenant required" }, { status: 400 });
      }

      return listTenantPaymentsPaginated(session.tenantId, pagination);
    },
    { requireTenant: true }
  );
}
