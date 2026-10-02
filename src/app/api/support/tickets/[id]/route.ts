import { withAuthorizedHandler } from "@/lib/auth/authorize";
import { parseBody } from "@/lib/validation/schemas";
import { setStatus, statusSchema } from "@/lib/support/support-service";
import { recordAudit, getClientIp } from "@/lib/audit/audit-service";
import { AUDIT_ACTIONS } from "@/lib/audit/actions";

/** An organisation admin resolves or reopens a support ticket. */
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return withAuthorizedHandler(
    "support:write",
    async ({ session }) => {
      const { status } = parseBody(statusSchema, await request.json());
      const change = await setStatus(session, id, status);
      await recordAudit({
        action: AUDIT_ACTIONS.SUPPORT_TICKET_STATUS_CHANGED,
        userId: session.id,
        tenantId: session.tenantId,
        ip: getClientIp(request),
        details: { ticketId: id, ...change },
      });
      return { ok: true };
    }, { requireTenant: true }
  );
}
