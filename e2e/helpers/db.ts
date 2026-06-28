import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export const E2E_PASSWORD = "Admin123!";
export const E2E_TENANT_ID = "e2e-tenant";
export const E2E_TENANT_ADMIN_EMAIL = "e2e-tenant@bizsim.com";
export const E2E_PARTICIPANT_EMAIL = "e2e-participant@bizsim.com";
export const E2E_PROGRAM_TOKEN = "e2e-program-token";

export async function seedE2EFixtures(): Promise<void> {
  const passwordHash = await bcrypt.hash(E2E_PASSWORD, 12);

  const tenant = await prisma.tenant.upsert({
    where: { id: E2E_TENANT_ID },
    update: {
      status: "ACTIVE",
      seatLimit: 50,
      seatsUsed: 0,
    },
    create: {
      id: E2E_TENANT_ID,
      name: "E2E Test Tenant",
      status: "ACTIVE",
      seatLimit: 50,
      seatsUsed: 0,
      planType: "50",
      email: E2E_TENANT_ADMIN_EMAIL,
    },
  });

  await prisma.tenantSettings.upsert({
    where: { tenantId: tenant.id },
    update: {},
    create: { tenantId: tenant.id },
  });

  const tenantAdmin = await prisma.user.upsert({
    where: {
      tenantId_email: { tenantId: tenant.id, email: E2E_TENANT_ADMIN_EMAIL },
    },
    update: { passwordHash, role: "TENANT_ADMIN" },
    create: {
      tenantId: tenant.id,
      email: E2E_TENANT_ADMIN_EMAIL,
      passwordHash,
      firstName: "E2E",
      lastName: "Tenant",
      role: "TENANT_ADMIN",
      language: "en",
    },
  });

  const participant = await prisma.user.upsert({
    where: {
      tenantId_email: { tenantId: tenant.id, email: E2E_PARTICIPANT_EMAIL },
    },
    update: { passwordHash, role: "PARTICIPANT" },
    create: {
      tenantId: tenant.id,
      email: E2E_PARTICIPANT_EMAIL,
      passwordHash,
      firstName: "E2E",
      lastName: "Participant",
      role: "PARTICIPANT",
      language: "en",
    },
  });

  const now = new Date();
  const program = await prisma.program.upsert({
    where: { applicationToken: E2E_PROGRAM_TOKEN },
    update: {
      applicationStart: new Date(now.getTime() - 86400000),
      applicationEnd: new Date(now.getTime() + 86400000 * 30),
      participantLimit: 100,
    },
    create: {
      tenantId: tenant.id,
      name: "E2E Entrepreneurship Program",
      description: "Program for automated end-to-end tests",
      type: "entrepreneurship_training",
      applicationStart: new Date(now.getTime() - 86400000),
      applicationEnd: new Date(now.getTime() + 86400000 * 30),
      participantLimit: 100,
      applicationToken: E2E_PROGRAM_TOKEN,
    },
  });

  await prisma.participant.upsert({
    where: {
      programId_userId: { programId: program.id, userId: participant.id },
    },
    update: { status: "ACTIVE" },
    create: {
      programId: program.id,
      userId: participant.id,
      status: "ACTIVE",
    },
  });

  await prisma.certificate.deleteMany({ where: { userId: participant.id } });
}

export async function createExhaustedSeatTenant(): Promise<{
  tenantId: string;
  token: string;
}> {
  const tenant = await prisma.tenant.create({
    data: {
      name: "E2E Exhausted Seats",
      status: "ACTIVE",
      seatLimit: 1,
      seatsUsed: 1,
    },
  });

  const program = await prisma.program.create({
    data: {
      tenantId: tenant.id,
      name: "Exhausted Seat Program",
      type: "entrepreneurship_training",
      applicationStart: new Date(Date.now() - 86400000),
      applicationEnd: new Date(Date.now() + 86400000 * 30),
      participantLimit: 10,
      applicationToken: `exhausted-${Date.now()}`,
    },
  });

  const passwordHash = await bcrypt.hash(E2E_PASSWORD, 12);
  const user = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: `occupied-${Date.now()}@e2e.test`,
      passwordHash,
      firstName: "Occupied",
      lastName: "Seat",
      role: "PARTICIPANT",
    },
  });

  await prisma.participant.create({
    data: { programId: program.id, userId: user.id, status: "ACTIVE" },
  });

  return { tenantId: tenant.id, token: program.applicationToken };
}

export async function cleanupE2ETenant(tenantId: string): Promise<void> {
  await prisma.certificate.deleteMany({
    where: { user: { tenantId } },
  });
  await prisma.participant.deleteMany({
    where: { program: { tenantId } },
  });
  await prisma.program.deleteMany({ where: { tenantId } });
  await prisma.payment.deleteMany({ where: { tenantId } });
  await prisma.auditLog.deleteMany({ where: { tenantId } });
  await prisma.user.deleteMany({ where: { tenantId } });
  await prisma.tenantSettings.deleteMany({ where: { tenantId } });
  await prisma.tenant.delete({ where: { id: tenantId } }).catch(() => undefined);
}

export { prisma };
