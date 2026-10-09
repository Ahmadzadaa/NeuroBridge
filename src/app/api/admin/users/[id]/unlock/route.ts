import { NextResponse } from "next/server";
import { withAuthorizedHandler } from "@/lib/auth/authorize";
import { prisma } from "@/lib/prisma";
import { recordAudit, getClientIp } from "@/lib/audit/audit-service";
import { AUDIT_ACTIONS } from "@/lib/audit/actions";

/** Platform team: lifts a lock left by too many failed sign-ins, e.g. while answering a support request. */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return withAuthorizedHandler("platform:admin", async ({ session }) => {
    const user = await prisma.user.findUnique({ where: { id }, select: { id: true, tenantId: true } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    await prisma.user.update({ where: { id }, data: { failedLoginAttempts: 0, lockedUntil: null } });
    await recordAudit({
      action: AUDIT_ACTIONS.USER_UNLOCKED,
      userId: session.id,
      tenantId: user.tenantId,
      ip: getClientIp(request),
      details: { targetUserId: id },
    });
    return { ok: true };
  });
}
