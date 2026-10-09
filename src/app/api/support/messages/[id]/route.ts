import { NextResponse } from "next/server";
import { apiErrorResponse, authorizeApi, getAuthSession } from "@/lib/auth/authorize";
import { parseBody } from "@/lib/validation/schemas";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { deleteMessage, editMessage, editMessageSchema } from "@/lib/support/message-edit";
import { recordAudit, getClientIp } from "@/lib/audit/audit-service";
import { AUDIT_ACTIONS } from "@/lib/audit/actions";

/** Both sides may change their own words: staff, and organisation admins (not read-only viewers). */
async function writer() {
  const session = await getAuthSession();
  if (!session) return null;
  await authorizeApi(session.role === "SUPER_ADMIN" ? "platform:admin" : "support:write");
  await enforceRateLimit("api", session.id);
  return session;
}

const unauthenticated = () => NextResponse.json({ error: "Authentication required" }, { status: 401 });

/** Edits the text of one's own support message. */
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    const session = await writer();
    if (!session) return unauthenticated();
    const { body } = parseBody(editMessageSchema, await request.json());
    const { ticketId } = await editMessage(session, id, body);
    await recordAudit({ action: AUDIT_ACTIONS.SUPPORT_MESSAGE_EDITED, userId: session.id, tenantId: session.tenantId, ip: getClientIp(request), details: { ticketId, messageId: id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

/** Removes one's own support message and its files. */
export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    const session = await writer();
    if (!session) return unauthenticated();
    const { ticketId, files } = await deleteMessage(session, id);
    await recordAudit({ action: AUDIT_ACTIONS.SUPPORT_MESSAGE_DELETED, userId: session.id, tenantId: session.tenantId, ip: getClientIp(request), details: { ticketId, messageId: id, files } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
