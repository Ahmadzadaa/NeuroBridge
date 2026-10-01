import { routing } from "@/i18n/routing";
import { NextResponse } from "next/server";
import { withAuthorizedHandler } from "@/lib/auth/authorize";
import { assertFeatureEnabled } from "@/lib/tenant/features";
import { addJurySchema, parseBody } from "@/lib/validation/schemas";
import { prisma } from "@/lib/prisma";
import { recordAudit, getClientIp } from "@/lib/audit/audit-service";
import { AUDIT_ACTIONS } from "@/lib/audit/actions";
import { unusablePasswordHash } from "@/lib/onboarding/activation-token";
import { sendMemberInvitation } from "@/lib/onboarding/member-invitation";

export async function POST(request: Request) {
  return withAuthorizedHandler(
    "hackathon:manage",
    async ({ session }) => {
      await assertFeatureEnabled(session.tenantId, "hackathon");
      if (!session.tenantId) {
        return NextResponse.json({ error: "Tenant required" }, { status: 400 });
      }
      const body = parseBody(addJurySchema, await request.json());

      const existing = await prisma.user.findUnique({
        where: {
          tenantId_email: { tenantId: session.tenantId, email: body.email },
        },
        select: { id: true, role: true },
      });

      let juryUserId: string;
      let created = false;

      if (existing) {
        if (existing.role === "JURY") {
          return NextResponse.json(
            { error: "Already a jury member" },
            { status: 409 }
          );
        }
        if (existing.role !== "PARTICIPANT") {
          // Never silently demote admin/viewer accounts.
          return NextResponse.json(
            { error: "User has an admin role — change it from user management" },
            { status: 409 }
          );
        }
        await prisma.user.update({
          where: { id: existing.id },
          data: { role: "JURY" },
        });
        juryUserId = existing.id;
      } else {
        const user = await prisma.user.create({
          data: {
            tenantId: session.tenantId,
            email: body.email,
            // Unusable until the invitee sets their own password from the email link.
            passwordHash: await unusablePasswordHash(),
            firstName: body.firstName,
            lastName: body.lastName,
            role: "JURY",
            language: session.language ?? routing.defaultLocale,
          },
        });
        juryUserId = user.id;
        created = true;
      }

      await recordAudit({
        action: AUDIT_ACTIONS.ROLE_CHANGED,
        userId: session.id,
        tenantId: session.tenantId,
        ip: getClientIp(request),
        details: {
          targetUserId: juryUserId,
          targetEmail: body.email,
          previousRole: existing?.role ?? null,
          newRole: "JURY",
          createdAccount: created,
        },
      });

      const emailed = created
        ? await sendMemberInvitation({
            userId: juryUserId,
            email: body.email,
            role: "JURY",
            tenantId: session.tenantId,
            language: session.language,
          })
        : false;

      return NextResponse.json(
        { id: juryUserId, created, emailed },
        { status: 201 }
      );
    },
    { requireTenant: true }
  );
}

export async function DELETE(request: Request) {
  return withAuthorizedHandler(
    "hackathon:manage",
    async ({ session }) => {
      await assertFeatureEnabled(session.tenantId, "hackathon");
      if (!session.tenantId) {
        return NextResponse.json({ error: "Tenant required" }, { status: 400 });
      }
      const body = parseBody(addJurySchema.pick({ email: true }), await request.json());

      const jury = await prisma.user.findUnique({
        where: {
          tenantId_email: { tenantId: session.tenantId, email: body.email },
        },
        select: { id: true, role: true },
      });
      if (!jury || jury.role !== "JURY") {
        return NextResponse.json({ error: "Jury member not found" }, { status: 404 });
      }

      await prisma.user.update({
        where: { id: jury.id },
        data: { role: "PARTICIPANT" },
      });

      await recordAudit({
        action: AUDIT_ACTIONS.ROLE_CHANGED,
        userId: session.id,
        tenantId: session.tenantId,
        ip: getClientIp(request),
        details: {
          targetUserId: jury.id,
          targetEmail: body.email,
          previousRole: "JURY",
          newRole: "PARTICIPANT",
        },
      });

      return NextResponse.json({ removed: true });
    },
    { requireTenant: true }
  );
}
