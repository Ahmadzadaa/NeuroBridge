import { withAuthorizedHandler } from "@/lib/auth/authorize";
import { finalistsSchema, parseBody } from "@/lib/validation/schemas";
import { confirmFinalists } from "@/lib/jury/program-jury";
import { recordAudit, getClientIp } from "@/lib/audit/audit-service";
import { AUDIT_ACTIONS } from "@/lib/audit/actions";

/** Confirms the finalist list, which opens their files to the jury. */
export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return withAuthorizedHandler(
    "jury:manage",
    async ({ session }) => {
      const { userIds } = parseBody(finalistsSchema, await request.json());
      const count = await confirmFinalists(session.tenantId!, id, userIds);
      await recordAudit({
        action: AUDIT_ACTIONS.JURY_UPDATED,
        userId: session.id,
        tenantId: session.tenantId,
        ip: getClientIp(request),
        details: { programId: id, finalists: count },
      });
      return { count };
    },
    { requireTenant: true }
  );
}
