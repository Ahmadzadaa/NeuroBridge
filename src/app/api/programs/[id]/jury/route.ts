import { withAuthorizedHandler } from "@/lib/auth/authorize";
import { jurySettingsSchema, parseBody } from "@/lib/validation/schemas";
import { updateJurySettings } from "@/lib/jury/program-jury";
import { recordAudit, getClientIp } from "@/lib/audit/audit-service";
import { AUDIT_ACTIONS } from "@/lib/audit/actions";

/** The organisation turns the jury round on or off and sets how many finalists it wants. */
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return withAuthorizedHandler(
    "jury:manage",
    async ({ session }) => {
      const body = parseBody(jurySettingsSchema, await request.json());
      const program = await updateJurySettings(session.tenantId!, id, body);
      await recordAudit({
        action: AUDIT_ACTIONS.JURY_UPDATED,
        userId: session.id,
        tenantId: session.tenantId,
        ip: getClientIp(request),
        details: { programId: id, ...body },
      });
      return program;
    },
    { requireTenant: true }
  );
}
