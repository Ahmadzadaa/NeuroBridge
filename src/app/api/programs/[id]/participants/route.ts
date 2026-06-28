import { NextResponse } from "next/server";
import { withAuthorizedHandler } from "@/lib/auth/authorize";
import { parsePagination } from "@/lib/pagination";
import { listProgramParticipants, ProgramNotFoundError } from "@/lib/participants/participant-service";
import { enforceRateLimit, getClientIdentifier } from "@/lib/security/rate-limit";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await enforceRateLimit("api", getClientIdentifier(request));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Rate limited" },
      { status: 429 }
    );
  }

  const { id: programId } = await context.params;
  const pagination = parsePagination(new URL(request.url).searchParams);

  return withAuthorizedHandler(
    "participant:read",
    async ({ session, context: tenantContext }) => {
      if (!session.tenantId) {
        return NextResponse.json({ error: "Tenant required" }, { status: 400 });
      }

      try {
        return await listProgramParticipants(
          tenantContext,
          programId,
          session.tenantId,
          pagination
        );
      } catch (error) {
        if (error instanceof ProgramNotFoundError) {
          return NextResponse.json({ error: error.message }, { status: 404 });
        }
        throw error;
      }
    },
    { requireTenant: true }
  );
}
