import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { createProgramSchema, parseBody } from "@/lib/validation/schemas";
import { buildTenantContext } from "@/lib/auth/session";

const hasTestDb = Boolean(process.env.TEST_DATABASE_URL);

describe.skipIf(!hasTestDb)("program creation integration", () => {
  it("creates a program with simulations and trainings", async () => {
    const tenant = await prisma.tenant.create({
      data: {
        name: "Program Create Tenant",
        status: "ACTIVE",
        seatLimit: 50,
        seatsUsed: 0,
      },
    });

    const body = parseBody(createProgramSchema, {
      name: "Integration Test Program",
      type: "entrepreneurship_training",
      applicationStart: new Date(Date.now() - 86400000).toISOString(),
      applicationEnd: new Date(Date.now() + 86400000 * 30).toISOString(),
      participantLimit: 25,
      simulations: ["idea_development"],
      trainings: ["finance"],
      aiTools: [],
    });

    const program = await prisma.program.create({
      data: {
        tenantId: tenant.id,
        name: body.name,
        description: body.description ?? null,
        type: body.type,
        applicationStart: body.applicationStart,
        applicationEnd: body.applicationEnd,
        participantLimit: body.participantLimit,
        programSimulations: {
          create: body.simulations.map((s) => ({ simulationType: s })),
        },
        programTrainings: {
          create: body.trainings.map((t) => ({ trainingType: t })),
        },
      },
      include: {
        programSimulations: true,
        programTrainings: true,
      },
    });

    expect(program.name).toBe("Integration Test Program");
    expect(program.programSimulations).toHaveLength(1);
    expect(program.programTrainings).toHaveLength(1);
    expect(program.applicationToken).toBeTruthy();

    const context = buildTenantContext({
      id: "admin-id",
      email: "admin@test.com",
      name: "Admin",
      role: "TENANT_ADMIN",
      tenantId: tenant.id,
      language: "en",
      twoFactorEnabled: false,
      twoFactorVerified: true,
      requires2FASetup: false,
    });

    expect(context.tenantId).toBe(tenant.id);

    await prisma.programSimulation.deleteMany({ where: { programId: program.id } });
    await prisma.programTraining.deleteMany({ where: { programId: program.id } });
    await prisma.program.delete({ where: { id: program.id } });
    await prisma.tenant.delete({ where: { id: tenant.id } });
  });
});
