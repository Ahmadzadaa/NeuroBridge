import { NextResponse } from "next/server";
import { withAuthorizedHandler } from "@/lib/auth/authorize";
import { parsePagination } from "@/lib/pagination";
import { listProgramParticipants } from "@/lib/participants/participant-service";
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

      // A missing programme throws ProgramNotFoundError, which carries its own
      // 404 and code for the shared error mapper.
      return listProgramParticipants(
        tenantContext,
        programId,
        session.tenantId,
        pagination
      );
    },
    { requireTenant: true }
  );
}
