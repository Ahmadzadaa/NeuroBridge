import { after } from "next/server";
import { withAuthorizedHandler } from "@/lib/auth/authorize";
import { getAppOrigin } from "@/lib/app-url";
import { notifyNewTicket } from "@/lib/support/support-notify";
import { parseBody } from "@/lib/validation/schemas";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { createTicket, newTicketSchema } from "@/lib/support/support-service";
import { checkFiles, readMessageRequest } from "@/lib/support/attachments";
import { recordAudit, getClientIp } from "@/lib/audit/audit-service";
import { AUDIT_ACTIONS } from "@/lib/audit/actions";

/** Optional JSON sent as a form field; a broken one is simply left out. */
function jsonField(raw: string | undefined): unknown {
  try {
    return raw ? JSON.parse(raw) : undefined;
  } catch {
    return undefined;
  }
}

/** An organisation admin opens a support ticket with the platform team. */
export async function POST(request: Request) {
  return withAuthorizedHandler(
    "support:write",
    async ({ session }) => {
      await enforceRateLimit("api", session.id);
      const { fields, files } = await readMessageRequest(request);
      const body = parseBody(newTicketSchema, { ...fields, context: jsonField(fields.context) });
      const checked = await checkFiles(files);
      const ticket = await createTicket({ ...session, tenantId: session.tenantId! }, body, {
        userAgent: request.headers.get("user-agent")?.slice(0, 400) ?? undefined,
        uiLocale: session.language,
      }, checked);
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
