import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    training: { findUnique: vi.fn() },
    lessonProjectSubmission: { upsert: vi.fn() },
  },
}));
vi.mock("@/lib/programs/participant-program", () => ({ getCurrentProgramForUser: vi.fn() }));

import { prisma } from "@/lib/prisma";
import { getCurrentProgramForUser } from "@/lib/programs/participant-program";
import { listUnits, submitProject, UnitError } from "@/lib/training/units-service";

const program = (simulations: string[]) =>
  ({ id: "prg_1", programSimulations: simulations.map((simulationType) => ({ simulationType })) }) as never;

const lesson = (id: string, order: number, opts: { video?: boolean; project?: boolean; attempt?: { score: number; passed: boolean } } = {}) => ({
  id,
  order,
  titleTr: `Birim ${order}`,
  titleEn: `Unit ${order}`,
  titleAz: `Bölmə ${order}`,
  videoUrl: null,
  points: 100,
  progress: opts.video ? [{ id: "p" }] : [],
  projectSubmissions: opts.project ? [{ id: "s" }] : [],
  unitExams: [{ id: `exam_${id}`, attempts: opts.attempt ? [opts.attempt] : [] }],
});

describe("training units", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.training.findUnique).mockResolvedValue({
      id: "tr_1",
      titleTr: "Fikir Geliştirme Simülasyonu",
      titleEn: "Idea Development Simulation",
      titleAz: "Fikir İnkişaf Simulyasiyası",
      lessons: [
        lesson("l1", 1, { video: true, project: true, attempt: { score: 90, passed: true } }),
        lesson("l2", 2, { video: true, attempt: { score: 40, passed: false } }),
        lesson("l3", 3),
      ],
    } as never);
  });

  it("are hidden when the program does not include the idea development simulation", async () => {
    vi.mocked(getCurrentProgramForUser).mockResolvedValue(program(["leadership"]));
    expect(await listUnits("usr_1", "en")).toBeNull();
    expect(prisma.training.findUnique).not.toHaveBeenCalled();
  });

  it("report each step and count points only for passed tests", async () => {
    vi.mocked(getCurrentProgramForUser).mockResolvedValue(program(["idea_development"]));
    const data = (await listUnits("usr_1", "en"))!;

    expect(data.title).toBe("Idea Development Simulation");
    expect(data.units.map((u) => [u.title, u.videoDone, u.projectDone, u.testScore, u.earned])).toEqual([
      ["Unit 1", true, true, 90, 100],
      ["Unit 2", true, false, 40, 0],
      ["Unit 3", false, false, null, 0],
    ]);
    expect([data.earned, data.total]).toEqual([100, 300]);
  });

  it("only accept project answers for units in the student's program", async () => {
    vi.mocked(getCurrentProgramForUser).mockResolvedValue(program(["idea_development"]));
    vi.mocked(prisma.lessonProjectSubmission.upsert).mockResolvedValue({} as never);

    await submitProject("usr_1", "l2", "Mahalle için bir beceri paylaşım panosu.");
    expect(prisma.lessonProjectSubmission.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { lessonId_userId: { lessonId: "l2", userId: "usr_1" } } })
    );

    await expect(submitProject("usr_1", "someone-elses-lesson", "x".repeat(30))).rejects.toBeInstanceOf(UnitError);

    vi.mocked(getCurrentProgramForUser).mockResolvedValue(null);
    await expect(submitProject("usr_1", "l2", "x".repeat(30))).rejects.toMatchObject({ code: "NOT_IN_PROGRAM" });
  });
});
