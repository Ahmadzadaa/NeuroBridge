import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { withAuthorizedHandler } from "@/lib/auth/authorize";
import { addJurySchema, parseBody } from "@/lib/validation/schemas";
import { prisma } from "@/lib/prisma";
import { recordAudit, getClientIp } from "@/lib/audit/audit-service";
import { AUDIT_ACTIONS } from "@/lib/audit/actions";
import { sendEmail } from "@/lib/email/email-service";
import { juryCredentialsEmail } from "@/lib/email/templates";

/** Readable one-time password like "Kx7-Qm2-Rp9". */
function generateTempPassword(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const pick = () =>
    Array.from(randomBytes(3))
      .map((b) => alphabet[b % alphabet.length])
      .join("");
  return `${pick()}-${pick()}-${pick()}`;
}

export async function POST(request: Request) {
  return withAuthorizedHandler(
    "hackathon:manage",
    async ({ session }) => {
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
      let tempPassword: string | null = null;
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
        tempPassword = generateTempPassword();
        const passwordHash = await bcrypt.hash(tempPassword, 12);
        const user = await prisma.user.create({
          data: {
            tenantId: session.tenantId,
            email: body.email,
            passwordHash,
            firstName: body.firstName,
            lastName: body.lastName,
            role: "JURY",
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

      // New accounts also get their credentials by email (dev: uploads/dev-emails).
      if (created && tempPassword) {
        const origin =
          process.env.APP_BASE_URL ?? new URL(request.url).origin;
        await sendEmail({
          to: body.email,
          ...juryCredentialsEmail({
            email: body.email,
            tempPassword,
            loginUrl: `${origin}/az/login`,
          }),
        });
      }

      // tempPassword is returned exactly once so the admin can hand it over.
      return NextResponse.json(
        { id: juryUserId, created, tempPassword },
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
