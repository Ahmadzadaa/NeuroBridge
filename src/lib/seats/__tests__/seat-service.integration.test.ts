import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  addSeatsFromPayment,
  consumeSeat,
  removeSeatsFromRefund,
} from "@/lib/seats/seat-service";
import { SeatLimitReachedError } from "@/lib/seats/errors";

const hasTestDb = Boolean(process.env.TEST_DATABASE_URL);

describe.skipIf(!hasTestDb)("seat-service integration", () => {
  it("consumes seats atomically until limit is reached", async () => {
    const tenant = await prisma.tenant.create({
      data: {
        name: "Seat Service Tenant",
        status: "ACTIVE",
        seatLimit: 2,
        seatsUsed: 0,
      },
    });

    await prisma.$transaction(async (tx) => {
      await consumeSeat(tx, tenant.id);
      await consumeSeat(tx, tenant.id);
    });

    await expect(
      prisma.$transaction(async (tx) => consumeSeat(tx, tenant.id))
    ).rejects.toBeInstanceOf(SeatLimitReachedError);

    const updated = await prisma.tenant.findUnique({ where: { id: tenant.id } });
    expect(updated?.seatsUsed).toBe(2);

    await prisma.tenant.delete({ where: { id: tenant.id } });
  });

  it("adds purchased seats to existing limit", async () => {
    const tenant = await prisma.tenant.create({
      data: {
        name: "Upgrade Tenant",
        status: "ACTIVE",
        seatLimit: 50,
        seatsUsed: 20,
        planType: "50",
      },
    });

    await prisma.$transaction(async (tx) => {
      const result = await addSeatsFromPayment(tx, tenant.id, 50);
      expect(result.previousLimit).toBe(50);
      expect(result.newLimit).toBe(100);
    });

    const updated = await prisma.tenant.findUnique({ where: { id: tenant.id } });
    expect(updated?.seatLimit).toBe(100);

    await prisma.tenant.delete({ where: { id: tenant.id } });
  });

  it("never reduces seat limit below seats used on refund", async () => {
    const tenant = await prisma.tenant.create({
      data: {
        name: "Refund Seat Tenant",
        status: "ACTIVE",
        seatLimit: 100,
        seatsUsed: 90,
      },
    });

    await prisma.$transaction(async (tx) => {
      const result = await removeSeatsFromRefund(tx, tenant.id, 50);
      expect(result.newLimit).toBe(90);
    });

    const updated = await prisma.tenant.findUnique({ where: { id: tenant.id } });
    expect(updated?.seatLimit).toBe(90);

    await prisma.tenant.delete({ where: { id: tenant.id } });
  });
});
