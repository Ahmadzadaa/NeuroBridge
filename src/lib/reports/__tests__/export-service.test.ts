import { beforeEach, describe, expect, it, vi } from "vitest";
import { exportProgramReportCsv } from "@/lib/reports/export-service";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    program: { findFirst: vi.fn() },
    participant: { findMany: vi.fn() },
  },
}));

import { prisma } from "@/lib/prisma";

describe("export-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws when program is not found", async () => {
    vi.mocked(prisma.program.findFirst).mockResolvedValue(null);
    await expect(exportProgramReportCsv("p1", "t1")).rejects.toThrow("Program not found");
  });

  it("builds CSV with escaped values", async () => {
    vi.mocked(prisma.program.findFirst).mockResolvedValue({
      id: "p1",
      name: "Test Program",
    } as never);

    vi.mocked(prisma.participant.findMany)
      .mockResolvedValueOnce([
        {
          id: "part1",
          status: "ACTIVE",
          registrationDate: new Date("2026-01-01"),
          user: {
            email: 'comma,test@example.com',
            firstName: 'John "Quote"',
            lastName: "Doe",
            coinBalance: 50,
          },
        },
      ] as never)
      .mockResolvedValueOnce([]);

    const report = await exportProgramReportCsv("p1", "t1");

    expect(report.rowCount).toBe(1);
    expect(report.content).toContain('"comma,test@example.com"');
    expect(report.content).toContain('"John ""Quote"""');
    expect(report.filename).toContain("Test_Program");
  });
});
