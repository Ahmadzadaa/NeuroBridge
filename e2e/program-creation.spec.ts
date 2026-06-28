import { test, expect } from "@playwright/test";
import { prisma } from "./helpers/db";
import { createProgramSchema, parseBody } from "../src/lib/validation/schemas";

test.describe("Program creation", () => {
  test("creates program for tenant via validated payload", async () => {
    const tenant = await prisma.tenant.create({
      data: {
        name: "E2E Program Tenant",
        status: "ACTIVE",
        seatLimit: 50,
        seatsUsed: 0,
      },
    });

    const body = parseBody(createProgramSchema, {
      name: "E2E Created Program",
      type: "hackathon",
      applicationStart: new Date(Date.now() - 86400000).toISOString(),
      applicationEnd: new Date(Date.now() + 86400000 * 14).toISOString(),
      participantLimit: 30,
      simulations: ["idea_development"],
      trainings: ["finance"],
      aiTools: [],
    });

    const program = await prisma.program.create({
      data: {
        tenantId: tenant.id,
        name: body.name,
        type: body.type,
        applicationStart: body.applicationStart,
        applicationEnd: body.applicationEnd,
        participantLimit: body.participantLimit,
      },
    });

    expect(program.applicationToken).toBeTruthy();
    expect(program.name).toBe("E2E Created Program");

    await prisma.program.delete({ where: { id: program.id } });
    await prisma.tenant.delete({ where: { id: tenant.id } });
  });
});
