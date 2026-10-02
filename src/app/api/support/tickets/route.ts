import { after } from "next/server";
import { withAuthorizedHandler } from "@/lib/auth/authorize";
import { getAppOrigin } from "@/lib/app-url";
import { notifyNewTicket } from "@/lib/support/support-notify";
import { parseBody } from "@/lib/validation/schemas";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { createTicket, newTicketSchema } from "@/lib/support/support-service";
import { recordAudit, getClientIp } from "@/lib/audit/audit-service";
import { AUDIT_ACTIONS } from "@/lib/audit/actions";

/** An organisation admin opens a support ticket with the platform team. */
export async function POST(request: Request) {
  return withAuthorizedHandler(
    "support:write",
    async ({ session }) => {
      await enforceRateLimit("api", session.id);
      const body = parseBody(newTicketSchema, await request.json());
      const ticket = await createTicket({ ...session, tenantId: session.tenantId! }, body, {
        userAgent: request.headers.get("user-agent")?.slice(0, 400) ?? undefined,
        uiLocale: session.language,
      });
      await recordAudit({
        action: AUDIT_ACTIONS.SUPPORT_TICKET_CREATED,
        userId: session.id,
        tenantId: session.tenantId,
        ip: getClientIp(request),
        details: { ticketId: ticket.id },
      });
      // Mail goes out after the response: the admin should not wait on it, and a mail problem must not fail the request.
      const origin = await getAppOrigin();
      after(() => notifyNewTicket(ticket.id, origin));
      return ticket;
    },
    { requireTenant: true }
  );
}
