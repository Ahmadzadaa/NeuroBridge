import { NextResponse } from "next/server";
import { withAuthorizedHandler } from "@/lib/auth/authorize";
import { parsePagination } from "@/lib/pagination";
import { listTenantParticipants } from "@/lib/participants/participant-service";
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

  const { searchParams } = new URL(request.url);
  const pagination = parsePagination(searchParams);
  const programId = searchParams.get("programId") ?? undefined;

  return withAuthorizedHandler(
    "participant:read",
    async ({ session, context }) => {
      if (!session.tenantId) {
        return NextResponse.json({ error: "Tenant required" }, { status: 400 });
      }

      return listTenantParticipants(
        context,
        session.tenantId,
        pagination,
        programId
      );
    },
    { requireTenant: true }
  );
}
