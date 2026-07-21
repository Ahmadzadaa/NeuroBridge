import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { joinTeacherSchema, parseBody } from "@/lib/validation/schemas";
import { ValidationError } from "@/lib/auth/permissions";
import { enforceRateLimit, getClientIdentifier } from "@/lib/security/rate-limit";
import { recordAudit, getClientIp } from "@/lib/audit/audit-service";
import { AUDIT_ACTIONS } from "@/lib/audit/actions";

/** Public info about a teacher invite (for the join page). */
export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params;

  const teacher = await prisma.user.findUnique({
    where: { inviteToken: token },
    select: {
      role: true,
      firstName: true,
      lastName: true,
      tenant: { select: { name: true, status: true } },
    },
  });
  if (!teacher || teacher.role !== "TEACHER" || teacher.tenant?.status !== "ACTIVE") {
    return NextResponse.json({ error: "Invalid invite" }, { status: 404 });
  }

  return NextResponse.json({
    teacherName: [teacher.firstName, teacher.lastName].filter(Boolean).join(" "),
    organizationName: teacher.tenant?.name ?? "",
  });
}

/** Student registration under a teacher's invite, with atomic seat check. */
export async function POST(
  request: Request,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params;

  try {
    await enforceRateLimit("registration", getClientIdentifier(request));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Rate limited" },
      { status: 429 }
    );
  }

  try {
    const body = parseBody(joinTeacherSchema, await request.json());

    const teacher = await prisma.user.findUnique({
      where: { inviteToken: token },
      select: {
        id: true,
        role: true,
        tenantId: true,
        tenant: { select: { status: true } },
      },
    });
    if (
      !teacher ||
      teacher.role !== "TEACHER" ||
      !teacher.tenantId ||
      teacher.tenant?.status !== "ACTIVE"
    ) {
      return NextResponse.json({ error: "Invalid invite" }, { status: 404 });
    }
    const tenantId = teacher.tenantId;

    const passwordHash = await bcrypt.hash(body.password, 12);

    const student = await prisma.$transaction(async (tx) => {
      const existing = await tx.user.findUnique({
        where: { tenantId_email: { tenantId, email: body.email } },
        select: { id: true },
      });
      if (existing) {
        throw new ValidationError("Bu e-poçt artıq qeydiyyatdan keçib");
      }

      // Seat consumption inside the transaction — checked before increment.
      const tenant = await tx.tenant.findUnique({
        where: { id: tenantId },
        select: { seatsUsed: true, seatLimit: true },
      });
      if (!tenant || tenant.seatsUsed >= tenant.seatLimit) {
        throw new ValidationError("Oturacaq limiti dolub — müəllimlə əlaqə saxlayın");
      }
      await tx.tenant.update({
        where: { id: tenantId },
        data: { seatsUsed: { increment: 1 } },
      });

      return tx.user.create({
        data: {
          tenantId,
          email: body.email,
          passwordHash,
          firstName: body.firstName,
          lastName: body.lastName,
          role: "PARTICIPANT",
          language: "az",
          teacherId: teacher.id,
        },
        select: { id: true, email: true },
      });
    });

    await recordAudit({
      action: AUDIT_ACTIONS.USER_CREATED,
      tenantId,
      userId: student.id,
      ip: getClientIp(request),
      details: { email: student.email, role: "PARTICIPANT", viaTeacher: teacher.id },
    });

    return NextResponse.json({ registered: true }, { status: 201 });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json(
        { error: error.message, issues: error.issues },
        { status: 400 }
      );
    }
    console.error("Join registration error:", error);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
