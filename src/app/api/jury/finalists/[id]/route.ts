import { withAuthorizedHandler } from "@/lib/auth/authorize";
import { evaluationSchema, parseBody } from "@/lib/validation/schemas";
import { saveEvaluation } from "@/lib/jury/juror-service";
import { recordAudit, getClientIp } from "@/lib/audit/audit-service";
import { AUDIT_ACTIONS } from "@/lib/audit/actions";

/** A juror saves (or submits) their scoring sheet for one finalist. */
export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return withAuthorizedHandler(
    "jury:score",
    async ({ session }) => {
      const body = parseBody(evaluationSchema, await request.json());
      const result = await saveEvaluation(session.id, id, body);
      if (body.submit) {
        await recordAudit({
          action: AUDIT_ACTIONS.JURY_EVALUATION_SUBMITTED,
          userId: session.id,
          tenantId: session.tenantId,
          ip: getClientIp(request),
          details: { finalistId: id },
        });
      }
      return result;
    },
    { requireTenant: true }
  );
}
