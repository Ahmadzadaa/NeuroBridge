import { randomBytes, randomUUID } from "crypto";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { withAuthorizedHandler } from "@/lib/auth/authorize";
import { assertFeatureEnabled } from "@/lib/tenant/features";
import { addJurySchema, parseBody } from "@/lib/validation/schemas";
import { prisma } from "@/lib/prisma";
import { recordAudit, getClientIp } from "@/lib/audit/audit-service";
import { AUDIT_ACTIONS } from "@/lib/audit/actions";
import { sendEmail } from "@/lib/email/email-service";
import { teacherCredentialsEmail } from "@/lib/email/templates";

function generateTempPassword(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const pick = () =>
    Array.from(randomBytes(3))
      .map((b) => alphabet[b % alphabet.length])
      .join("");
  return `${pick()}-${pick()}-${pick()}`;
}

/**
 * Dean flow: creates a TEACHER account (or promotes an existing participant),
 * assigns a student-invite token, emails credentials, returns the one-time
 * password once. The dean manages teachers — never their students.
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

      const existing = await prisma.user.findUnique({
        where: {
          tenantId_email: { tenantId: session.tenantId, email: body.email },
        },
        select: { id: true, role: true, inviteToken: true },
      });

      let teacherId: string;
      let tempPassword: string | null = null;
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
        tempPassword = generateTempPassword();
        const passwordHash = await bcrypt.hash(tempPassword, 12);
        const user = await prisma.user.create({
          data: {
            tenantId: session.tenantId,
            email: body.email,
            passwordHash,
            firstName: body.firstName,
            lastName: body.lastName,
            role: "TEACHER",
            language: "az",
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

      if (created && tempPassword) {
        const tenant = await prisma.tenant.findUnique({
          where: { id: session.tenantId },
          select: { name: true },
        });
        const origin = process.env.APP_BASE_URL ?? new URL(request.url).origin;
        await sendEmail({
          to: body.email,
          ...teacherCredentialsEmail({
            email: body.email,
            tempPassword,
            loginUrl: `${origin}/az/login`,
            organizationName: tenant?.name,
          }),
        });
      }

      return NextResponse.json(
        { id: teacherId, created, tempPassword },
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
