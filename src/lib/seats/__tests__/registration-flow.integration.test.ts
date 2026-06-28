import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { registerParticipant } from "@/lib/seats/registration-service";
import { SeatLimitReachedError } from "@/lib/seats/errors";

const hasTestDb = Boolean(process.env.TEST_DATABASE_URL);

describe.skipIf(!hasTestDb)("registration flow integration", () => {
  it("registers a participant and consumes a seat", async () => {
    const tenant = await prisma.tenant.create({
      data: {
        name: "Registration Flow Tenant",
        status: "ACTIVE",
        seatLimit: 5,
        seatsUsed: 0,
      },
    });

    const program = await prisma.program.create({
      data: {
        tenantId: tenant.id,
        name: "Open Program",
        type: "entrepreneurship_training",
        applicationStart: new Date(Date.now() - 86400000),
        applicationEnd: new Date(Date.now() + 86400000 * 30),
        participantLimit: 10,
        applicationToken: `reg-flow-${Date.now()}`,
      },
    });

    const result = await registerParticipant({
      token: program.applicationToken,
      email: `reg-${Date.now()}@test.com`,
      password: "Password123!",
      firstName: "Test",
      lastName: "User",
    });

    expect(result.programId).toBe(program.id);
    expect(result.seatsUsed).toBe(1);

    const updatedTenant = await prisma.tenant.findUnique({ where: { id: tenant.id } });
    expect(updatedTenant?.seatsUsed).toBe(1);

    await prisma.participant.deleteMany({ where: { programId: program.id } });
    await prisma.user.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.program.delete({ where: { id: program.id } });
    await prisma.auditLog.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.tenant.delete({ where: { id: tenant.id } });
  });

  it("rejects registration when seats are exhausted", async () => {
    const tenant = await prisma.tenant.create({
      data: {
        name: "Exhausted Tenant",
        status: "ACTIVE",
        seatLimit: 1,
        seatsUsed: 1,
      },
    });

    const program = await prisma.program.create({
      data: {
        tenantId: tenant.id,
        name: "Full Program",
        type: "entrepreneurship_training",
        applicationStart: new Date(Date.now() - 86400000),
        applicationEnd: new Date(Date.now() + 86400000 * 30),
        participantLimit: 10,
        applicationToken: `exhausted-${Date.now()}`,
      },
    });

    await expect(
      registerParticipant({
        token: program.applicationToken,
        email: `fail-${Date.now()}@test.com`,
        password: "Password123!",
        firstName: "Fail",
        lastName: "User",
      })
    ).rejects.toBeInstanceOf(SeatLimitReachedError);

    await prisma.program.delete({ where: { id: program.id } });
    await prisma.auditLog.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.tenant.delete({ where: { id: tenant.id } });
  });
});
