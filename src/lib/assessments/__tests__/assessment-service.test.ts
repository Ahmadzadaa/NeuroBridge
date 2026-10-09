import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => {
  const tx = {
    assessmentResult: { findUnique: vi.fn(), create: vi.fn(), count: vi.fn() },
    assessment: { count: vi.fn() },
    user: { findUnique: vi.fn(), findMany: vi.fn() },
    tenantNotification: { create: vi.fn() },
    notification: { createMany: vi.fn() },
  };
  return {
    prisma: {
      assessment: { findMany: vi.fn(), findFirst: vi.fn() },
      participant: { findMany: vi.fn(), count: vi.fn().mockResolvedValue(2) },
      $transaction: vi.fn((fn: (client: typeof tx) => unknown) => fn(tx)),
      __tx: tx,
    },
  };
});
vi.mock("@/lib/programs/participant-program", () => ({
  getCurrentProgramForUser: vi.fn().mockResolvedValue({ id: "prg_1" }),
}));

import { prisma } from "@/lib/prisma";
import { getTenantAssessmentOverview, submitAssessment } from "@/lib/assessments/assessment-service";

type Mock = ReturnType<typeof vi.fn>;
const tx = (prisma as unknown as { __tx: Record<string, Record<string, Mock>> }).__tx;
const T = (tr: string) => JSON.stringify({ tr });

const CHAR = { id: "as_char", code: "CHARACTER_CREATIVITY", kind: "CHARACTER", title: T("Karakter"), dimensions: [] };
const PSYCH = { id: "as_psych", code: "PSYCH_STATE", kind: "PSYCH", title: T("Psikolojik"), dimensions: [] };

function participant(userId: string, psychConsent: boolean | null) {
  return {
    programId: "prg_1",
    program: { name: "Program" },
    user: {
      id: userId,
      firstName: "Ö",
      lastName: userId,
      email: `${userId}@uni.test`,
      assessmentResults: [
        { programId: "prg_1", assessmentId: "as_char", scores: '{"CURIOSITY":80}', completedAt: new Date() },
        { programId: "prg_1", assessmentId: "as_psych", scores: '{"STRESS_BALANCE":30}', completedAt: new Date() },
      ],
      consents: psychConsent === null ? [] : [{ granted: psychConsent }],
    },
  };
}

describe("getTenantAssessmentOverview", () => {
  beforeEach(() => {
    vi.mocked(prisma.assessment.findMany).mockResolvedValue([CHAR, PSYCH] as never);
  });

  it("shows psychological scores only with the separate consent", async () => {
    vi.mocked(prisma.participant.findMany).mockResolvedValue([
      participant("consented", true),
      participant("refused", false),
      participant("never_asked", null),
    ] as never);

    const { rows } = await getTenantAssessmentOverview("ten_1", "tr");
    const psych = (userId: string) => rows.find((r) => r.userId === userId)!.results.find((x) => x.code === "PSYCH_STATE")!;
    const char = (userId: string) => rows.find((r) => r.userId === userId)!.results.find((x) => x.code === "CHARACTER_CREATIVITY")!;

    expect(psych("consented").scores).toEqual({ STRESS_BALANCE: 30 });
    for (const id of ["refused", "never_asked"]) {
      expect(psych(id).scores).toBeNull();
      expect(psych(id).completedAt).toBeInstanceOf(Date); // completion is still visible
      expect(char(id).scores).toEqual({ CURIOSITY: 80 }); // non-psych results are not gated
    }
  });

  it("only queries the tenant's own participants", async () => {
    vi.mocked(prisma.participant.findMany).mockResolvedValue([] as never);
    await getTenantAssessmentOverview("ten_1", "tr");
    expect(vi.mocked(prisma.participant.findMany).mock.calls[0][0]).toMatchObject({
      where: { program: { tenantId: "ten_1" } },
    });
  });
});

describe("submitAssessment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.assessment.findFirst).mockResolvedValue({
      ...PSYCH,
      version: "demo-1",
      scaleMin: 1,
      scaleMax: 5,
      questions: [{ id: "q1", dimensionCode: "STRESS_BALANCE", reverse: false }],
    } as never);
    tx.assessmentResult.findUnique.mockResolvedValue(null);
    tx.user.findUnique.mockResolvedValue({ tenantId: "ten_1", firstName: "Aysel", lastName: "Ə", email: "a@example.com" });
    tx.user.findMany.mockResolvedValue([{ id: "adm_1" }]);
  });

  it("notifies the university when the last baseline test is completed", async () => {
    tx.assessment.count.mockResolvedValue(2);
    tx.assessmentResult.count.mockResolvedValue(2);

    const result = await submitAssessment("usr_1", "PSYCH_STATE", { q1: 5 });

    expect(result).toEqual({ scores: { STRESS_BALANCE: 100 }, analysisComplete: true });
    expect(tx.tenantNotification.create).toHaveBeenCalledWith({
      data: { tenantId: "ten_1", type: "ASSESSMENTS_COMPLETED", payload: JSON.stringify({ userId: "usr_1", programId: "prg_1" }) },
    });
    // The admins also get it under the bell.
    expect(tx.notification.createMany).toHaveBeenCalledWith({
      data: [{ userId: "adm_1", type: "ASSESSMENTS_COMPLETED", params: JSON.stringify({ student: "Aysel Ə" }), link: "/tenant/assessments" }],
    });
  });

  it("does not notify while tests are still outstanding", async () => {
    tx.assessment.count.mockResolvedValue(2);
    tx.assessmentResult.count.mockResolvedValue(1);

    expect((await submitAssessment("usr_1", "PSYCH_STATE", { q1: 3 })).analysisComplete).toBe(false);
    expect(tx.tenantNotification.create).not.toHaveBeenCalled();
  });

  it("refuses a second submission of the same test", async () => {
    tx.assessmentResult.findUnique.mockResolvedValue({ id: "res_1" });

    await expect(submitAssessment("usr_1", "PSYCH_STATE", { q1: 3 })).rejects.toMatchObject({
      code: "ALREADY_COMPLETED",
      statusCode: 409,
    });
    expect(tx.assessmentResult.create).not.toHaveBeenCalled();
  });
});
