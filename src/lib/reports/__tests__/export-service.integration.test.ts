import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { exportProgramReportCsv } from "@/lib/reports/export-service";

const hasTestDb = Boolean(process.env.TEST_DATABASE_URL);

describe.skipIf(!hasTestDb)("export-service integration", () => {
  it("exports CSV with escaped values and participant rows", async () => {
    const tenant = await prisma.tenant.create({
      data: {
        name: "Export Tenant",
        status: "ACTIVE",
        seatLimit: 10,
        seatsUsed: 1,
      },
    });

    const user = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: "export,test@example.com",
        passwordHash: "hash",
        firstName: 'John "Quote"',
        lastName: "Doe",
        role: "PARTICIPANT",
        coinBalance: 100,
      },
    });

    const program = await prisma.program.create({
      data: {
        tenantId: tenant.id,
        name: "Export Program",
        type: "entrepreneurship_training",
        applicationStart: new Date(),
        applicationEnd: new Date(Date.now() + 86400000),
        participantLimit: 10,
      },
    });

    await prisma.participant.create({
      data: { programId: program.id, userId: user.id, status: "ACTIVE" },
    });

    const report = await exportProgramReportCsv(program.id, tenant.id);

    expect(report.rowCount).toBe(1);
    expect(report.content).toContain("export,test@example.com");
    expect(report.content).toContain('"John ""Quote"""');
    expect(report.filename).toContain("Export_Program");

    await expect(
      exportProgramReportCsv(program.id, "wrong-tenant-id")
    ).rejects.toThrow("Program not found");

    await prisma.participant.deleteMany({ where: { programId: program.id } });
    await prisma.program.delete({ where: { id: program.id } });
    await prisma.user.delete({ where: { id: user.id } });
    await prisma.tenant.delete({ where: { id: tenant.id } });
  });
});
