import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { withAuthorizedHandler } from "@/lib/auth/authorize";
import { changePasswordSchema, parseBody } from "@/lib/validation/schemas";
import { prisma } from "@/lib/prisma";
import { recordAudit, getClientIp } from "@/lib/audit/audit-service";
import { AUDIT_ACTIONS } from "@/lib/audit/actions";

export async function POST(request: Request) {
  return withAuthorizedHandler("settings:read", async ({ session }) => {
    const body = parseBody(changePasswordSchema, await request.json());

    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: { passwordHash: true },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const valid = await bcrypt.compare(body.currentPassword, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(body.newPassword, 12);
    await prisma.user.update({
      where: { id: session.id },
      data: { passwordHash },
    });

    await recordAudit({
      action: AUDIT_ACTIONS.PASSWORD_CHANGED,
      userId: session.id,
      tenantId: session.tenantId ?? undefined,
      ip: getClientIp(request),
      details: { selfService: true },
    });

    return NextResponse.json({ changed: true });
  });
}
