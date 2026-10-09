import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuthorizedHandler } from "@/lib/auth/authorize";
import { roleChangeSchema, parseBody } from "@/lib/validation/schemas";
import { recordAudit, getClientIp } from "@/lib/audit/audit-service";
import { AUDIT_ACTIONS } from "@/lib/audit/actions";
import type { UserRole } from "@/lib/types";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  return withAuthorizedHandler(
    "user:write",
    async ({ session }) => {
      if (!session.tenantId) {
        return NextResponse.json({ error: "Tenant required" }, { status: 400 });
      }

      const body = parseBody(roleChangeSchema, await request.json());
      const target = await prisma.user.findFirst({
        where: { id, tenantId: session.tenantId },
        select: { id: true, role: true, email: true },
      });

      if (!target) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      if (target.id === session.id && body.role !== target.role) {
        return NextResponse.json(
          { error: "Cannot change your own role" },
          { status: 400 }
        );
      }

      const previousRole = target.role;
      const updated = await prisma.user.update({
        where: { id: target.id },
        data: { role: body.role },
        select: { id: true, email: true, role: true },
      });

      await recordAudit({
        action: AUDIT_ACTIONS.ROLE_CHANGED,
        userId: session.id,
        tenantId: session.tenantId,
        ip: getClientIp(request),
        details: {
          targetUserId: target.id,
          targetEmail: target.email,
          previousRole,
          newRole: body.role as UserRole,
        },
      });

      return updated;
    },
    { requireTenant: true }
  );
}
