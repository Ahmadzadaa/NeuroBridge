import { routing } from "@/i18n/routing";
import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { withAuthorizedHandler } from "@/lib/auth/authorize";
import { assertFeatureEnabled } from "@/lib/tenant/features";
import { addJurySchema, parseBody } from "@/lib/validation/schemas";
import { prisma } from "@/lib/prisma";
import { recordAudit, getClientIp } from "@/lib/audit/audit-service";
import { AUDIT_ACTIONS } from "@/lib/audit/actions";
import { unusablePasswordHash } from "@/lib/onboarding/activation-token";
import { sendMemberInvitation } from "@/lib/onboarding/member-invitation";

/**
 * Dean flow: creates a TEACHER account (or promotes an existing participant),
 * assigns a student-invite token and emails a one-time set-password link.
 * The dean manages teachers — never their students.
 */
export async function POST(request: Request) {
  return withAuthorizedHandler(
    "teacher:manage",
    async ({ session }) => {
      await assertFeatureEnabled(session.tenantId, "teachers");
      if (!session.tenantId) {
        return NextResponse.json({ error: "Tenant required" }, { status: 400 });
      }
      const body = parseBody(addJurySchema, await request.json());
      // The language the admin is working in: the invite should read the same.
      const language = body.locale ?? session.language ?? routing.defaultLocale;

      const existing = await prisma.user.findUnique({
        where: {
          tenantId_email: { tenantId: session.tenantId, email: body.email },
        },
        select: { id: true, role: true, inviteToken: true },
      });

      let teacherId: string;
      let created = false;

      if (existing) {
        if (existing.role === "TEACHER") {
          return NextResponse.json(
            { error: "Already a teacher" },
            { status: 409 }
          );
        }
        if (existing.role !== "PARTICIPANT") {
          return NextResponse.json(
            { error: "User has an admin role — change it from user management" },
            { status: 409 }
          );
        }
        await prisma.user.update({
          where: { id: existing.id },
          data: {
            role: "TEACHER",
            inviteToken: existing.inviteToken ?? randomUUID(),
          },
        });
        teacherId = existing.id;
      } else {
        const user = await prisma.user.create({
          data: {
            tenantId: session.tenantId,
            email: body.email,
            // Unusable until the invitee sets their own password from the email link.
            passwordHash: await unusablePasswordHash(),
            firstName: body.firstName,
            lastName: body.lastName,
            role: "TEACHER",
            // The teacher has no preference yet; the admin's UI language is the best guess.
            language,
            inviteToken: randomUUID(),
          },
        });
        teacherId = user.id;
        created = true;
      }

      await recordAudit({
        action: AUDIT_ACTIONS.ROLE_CHANGED,
        userId: session.id,
        tenantId: session.tenantId,
        ip: getClientIp(request),
        details: {
          targetUserId: teacherId,
          targetEmail: body.email,
          previousRole: existing?.role ?? null,
          newRole: "TEACHER",
          createdAccount: created,
        },
      });

      const emailed = created
        ? await sendMemberInvitation({
            userId: teacherId,
            email: body.email,
            role: "TEACHER",
            tenantId: session.tenantId,
            language,
          })
        : false;

      return NextResponse.json(
        { id: teacherId, created, emailed },
        { status: 201 }
      );
    },
    { requireTenant: true }
  );
}

export async function DELETE(request: Request) {
  return withAuthorizedHandler(
    "teacher:manage",
    async ({ session }) => {
      await assertFeatureEnabled(session.tenantId, "teachers");
      if (!session.tenantId) {
        return NextResponse.json({ error: "Tenant required" }, { status: 400 });
      }
      const body = parseBody(
        addJurySchema.pick({ email: true }),
        await request.json()
      );

      const teacher = await prisma.user.findUnique({
        where: {
          tenantId_email: { tenantId: session.tenantId, email: body.email },
        },
        select: { id: true, role: true },
      });
      if (!teacher || teacher.role !== "TEACHER") {
        return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
      }

      // Students stay linked (history preserved); the account loses teacher access.
      await prisma.user.update({
        where: { id: teacher.id },
        data: { role: "PARTICIPANT" },
      });

      await recordAudit({
        action: AUDIT_ACTIONS.ROLE_CHANGED,
        userId: session.id,
        tenantId: session.tenantId,
        ip: getClientIp(request),
        details: {
          targetUserId: teacher.id,
          targetEmail: body.email,
          previousRole: "TEACHER",
          newRole: "PARTICIPANT",
        },
      });

      return NextResponse.json({ removed: true });
    },
    { requireTenant: true }
  );
}
