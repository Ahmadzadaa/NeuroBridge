import bcrypt from "bcryptjs";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit/audit-service";
import { AUDIT_ACTIONS } from "@/lib/audit/actions";
import {
  DuplicateRegistrationError,
  EmailAlreadyRegisteredError,
  ProgramCapacityReachedError,
  RegistrationClosedError,
} from "@/lib/seats/errors";
import { consumeSeat, lockTenantForUpdate } from "@/lib/seats/seat-service";
import { invalidateCache } from "@/lib/cache/cache-service";

export interface RegisterParticipantInput {
  token: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface RegisterParticipantResult {
  userId: string;
  participantId: string;
  programId: string;
  seatsUsed: number;
  seatLimit: number;
}

async function lockProgramForUpdate(
  tx: Prisma.TransactionClient,
  programId: string
): Promise<{ id: string; tenant_id: string; participant_limit: number }> {
  const rows = await tx.$queryRaw<
    Array<{
      id: string;
      tenant_id: string;
      participant_limit: number;
      application_start: Date;
      application_end: Date;
    }>
  >`
    SELECT id, tenant_id, participant_limit, application_start, application_end
    FROM programs
    WHERE id = ${programId}
    FOR UPDATE
  `;

  const row = rows[0];
  if (!row) {
    throw new Error("Program not found");
  }

  return row;
}

function assertRegistrationWindow(
  applicationStart: Date,
  applicationEnd: Date
): void {
  const now = new Date();
  if (now < applicationStart || now > applicationEnd) {
    throw new RegistrationClosedError();
  }
}

export async function registerParticipant(
  input: RegisterParticipantInput
): Promise<RegisterParticipantResult> {
  const email = input.email.toLowerCase().trim();

  const program = await prisma.program.findUnique({
    where: { applicationToken: input.token },
    select: {
      id: true,
      tenantId: true,
      applicationStart: true,
      applicationEnd: true,
      participantLimit: true,
    },
  });

  if (!program) {
    throw new Error("Invalid application token");
  }

  assertRegistrationWindow(program.applicationStart, program.applicationEnd);

  const passwordHash = await bcrypt.hash(input.password, 12);

  const result = await prisma.$transaction(async (tx) => {
    await lockProgramForUpdate(tx, program.id);
    assertRegistrationWindow(program.applicationStart, program.applicationEnd);

    const participantCount = await tx.participant.count({
      where: { programId: program.id },
    });

    if (participantCount >= program.participantLimit) {
      throw new ProgramCapacityReachedError();
    }

    const existingEnrollment = await tx.participant.findFirst({
      where: {
        programId: program.id,
        user: { email },
      },
    });

    if (existingEnrollment) {
      throw new DuplicateRegistrationError();
    }

    const existingUser = await tx.user.findFirst({
      where: { tenantId: program.tenantId, email },
    });

    if (existingUser) {
      const enrolled = await tx.participant.findUnique({
        where: {
          programId_userId: {
            programId: program.id,
            userId: existingUser.id,
          },
        },
      });
      if (enrolled) {
        throw new DuplicateRegistrationError();
      }
      throw new EmailAlreadyRegisteredError();
    }

    const seatState = await consumeSeat(tx, program.tenantId);

    const user = await tx.user.create({
      data: {
        tenantId: program.tenantId,
        email,
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone ?? null,
        role: "PARTICIPANT",
        language: "tr",
      },
    });

    const participant = await tx.participant.create({
      data: {
        programId: program.id,
        userId: user.id,
        status: "ACTIVE",
      },
    });

    await recordAudit({
      tx,
      action: AUDIT_ACTIONS.PARTICIPANT_REGISTERED,
      tenantId: program.tenantId,
      userId: user.id,
      details: {
        programId: program.id,
        participantId: participant.id,
        seatsUsed: seatState.seatsUsed,
        seatLimit: seatState.seatLimit,
      },
    });

    await recordAudit({
      tx,
      action: AUDIT_ACTIONS.USER_CREATED,
      tenantId: program.tenantId,
      userId: user.id,
      details: { email, role: "PARTICIPANT" },
    });

    return {
      userId: user.id,
      participantId: participant.id,
      programId: program.id,
      seatsUsed: seatState.seatsUsed,
      seatLimit: seatState.seatLimit,
    };
  });

  const { invalidateTenantProgramCaches } = await import("@/lib/cache/cache-service");
  await invalidateTenantProgramCaches(program.tenantId);
  await invalidateCache(`apply:token:${input.token}`);

  return result;
}

export async function getProgramByApplicationToken(token: string) {
  return prisma.program.findUnique({
    where: { applicationToken: token },
    select: {
      id: true,
      name: true,
      description: true,
      type: true,
      applicationStart: true,
      applicationEnd: true,
      participantLimit: true,
      tenant: {
        select: {
          name: true,
          status: true,
          seatLimit: true,
          seatsUsed: true,
        },
      },
      _count: { select: { participants: true } },
    },
  });
}

export { lockTenantForUpdate };
