import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { registerParticipant } from "@/lib/seats/registration-service";
import { SeatLimitReachedError } from "@/lib/seats/errors";

const hasTestDb = Boolean(process.env.TEST_DATABASE_URL);

describe.skipIf(!hasTestDb)("registration concurrency", () => {
  it("allows exactly seatLimit successes under 500 concurrent registrations", async () => {
    const seatLimit = 50;
    const attempts = 500;

    const tenant = await prisma.tenant.create({
      data: {
        name: "Concurrency Tenant",
        status: "ACTIVE",
        seatLimit,
        seatsUsed: 0,
      },
    });

    const now = new Date();
    const program = await prisma.program.create({
      data: {
        tenantId: tenant.id,
        name: "Concurrency Program",
        type: "entrepreneurship_training",
        applicationStart: new Date(now.getTime() - 60_000),
        applicationEnd: new Date(now.getTime() + 86_400_000),
        participantLimit: attempts,
      },
    });

    const results = await Promise.allSettled(
      Array.from({ length: attempts }, (_, index) =>
        registerParticipant({
          token: program.applicationToken,
          email: `user${index}@concurrency.test`,
          password: "Password123!",
          consents: { privacyNotice: true, dataUse: false, opportunities: false, psychResultsShare: false },
          firstName: "Test",
          lastName: `User${index}`,
        })
      )
    );

    const successes = results.filter((result) => result.status === "fulfilled");
    const seatErrors = results.filter(
      (result) =>
        result.status === "rejected" &&
        result.reason instanceof SeatLimitReachedError
    );

    const updatedTenant = await prisma.tenant.findUnique({ where: { id: tenant.id } });
    const participantCount = await prisma.participant.count({
      where: { programId: program.id },
    });

    expect(successes).toHaveLength(seatLimit);
    expect(seatErrors.length).toBe(attempts - seatLimit);
    expect(updatedTenant?.seatsUsed).toBe(seatLimit);
    expect(participantCount).toBe(seatLimit);

    await prisma.participant.deleteMany({ where: { programId: program.id } });
    await prisma.user.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.auditLog.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.program.delete({ where: { id: program.id } });
    await prisma.tenant.delete({ where: { id: tenant.id } });
  }, 120_000);
});
