import { NextResponse } from "next/server";
import { withAuthorizedHandler } from "@/lib/auth/authorize";
import { leadStatusSchema, parseBody } from "@/lib/validation/schemas";
import { prisma } from "@/lib/prisma";
import { recordAudit, getClientIp } from "@/lib/audit/audit-service";
import { AUDIT_ACTIONS } from "@/lib/audit/actions";

/** Moves a demo request along the sales pipeline. Platform team only. */
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return withAuthorizedHandler("platform:admin", async ({ session }) => {
    const { status } = parseBody(leadStatusSchema, await request.json());
    const lead = await prisma.lead.findUnique({ where: { id }, select: { status: true } });
    if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

    await prisma.lead.update({ where: { id }, data: { status } });
    await recordAudit({
      action: AUDIT_ACTIONS.LEAD_UPDATED,
      userId: session.id,
      tenantId: null,
      ip: getClientIp(request),
      details: { leadId: id, from: lead.status, to: status },
    });
    return { id, status };
  });
}
