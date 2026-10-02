import { prisma } from "@/lib/prisma";
import { getCurrentProgramForUser } from "@/lib/programs/participant-program";
import { localized } from "@/lib/i18n-content";

/**
 * Training units of the Idea Development simulation: each is a Lesson
 * (video) + project brief + a 10-question Exam, worth `points` coins on the
 * first pass. Units show only when the student's program includes the
 * idea_development simulation.
 */

export const IDEA_DEV_TRAINING_KEY = "idea_development_sim";
export const PROJECT_MAX_LENGTH = 5000;

export type ProjectBrief = { scenario: string; tasks: string[] };

export class UnitError extends Error {
  constructor(
    public readonly code: "NOT_FOUND" | "NOT_IN_PROGRAM",
    public readonly statusCode: number
  ) {
    super(`Training unit: ${code}`);
    this.name = "UnitError";
  }
}

async function unitsTraining(userId: string) {
  const program = await getCurrentProgramForUser(userId);
  if (!program || !program.programSimulations.some((s) => s.simulationType === "idea_development")) return null;
  return prisma.training.findUnique({
    where: { key: IDEA_DEV_TRAINING_KEY },
    select: {
      id: true,
      titleTr: true,
      titleEn: true,
      titleAz: true,
      lessons: {
        where: { activity: { not: null } },
        orderBy: { order: "asc" },
        select: {
          id: true,
          order: true,
          titleTr: true,
          titleEn: true,
          titleAz: true,
          videoUrl: true,
          videoKey: true,
          points: true,
          progress: { where: { userId }, select: { id: true } },
          projectSubmissions: { where: { userId }, select: { id: true } },
          unitExams: {
            select: { id: true, attempts: { where: { userId }, select: { score: true, passed: true } } },
          },
        },
      },
    },
  });
}

function unitStatus(lesson: NonNullable<Awaited<ReturnType<typeof unitsTraining>>>["lessons"][number]) {
  const attempt = lesson.unitExams[0]?.attempts[0] ?? null;
  return {
    videoDone: lesson.progress.length > 0,
    projectDone: lesson.projectSubmissions.length > 0,
    testScore: attempt?.score ?? null,
    testPassed: attempt?.passed ?? false,
  };
}

export async function listUnits(userId: string, locale: string) {
  const training = await unitsTraining(userId);
  if (!training) return null;
  const units = training.lessons.map((l) => {
    const status = unitStatus(l);
    return {
      id: l.id,
      order: l.order,
      title: localized(l, "title", locale),
      points: l.points,
      earned: status.testPassed ? l.points : 0,
      ...status,
    };
  });
  return {
    title: localized(training, "title", locale),
    units,
    earned: units.reduce((n, u) => n + u.earned, 0),
    total: units.reduce((n, u) => n + u.points, 0),
  };
}

export async function getUnit(userId: string, lessonId: string, locale: string) {
  const training = await unitsTraining(userId);
  const lesson = training?.lessons.find((l) => l.id === lessonId);
  if (!lesson) throw new UnitError("NOT_FOUND", 404);

  const full = await prisma.lesson.findUniqueOrThrow({
    where: { id: lessonId },
    select: { projectBrief: true, projectSubmissions: { where: { userId }, select: { content: true, updatedAt: true } } },
  });
  return {
    id: lesson.id,
    order: lesson.order,
    title: localized(lesson, "title", locale),
    hasVideo: Boolean(lesson.videoUrl || lesson.videoKey),
    points: lesson.points,
    examId: lesson.unitExams[0]?.id ?? null,
    brief: full.projectBrief ? (JSON.parse(full.projectBrief) as ProjectBrief) : null,
    submission: full.projectSubmissions[0] ?? null,
    ...unitStatus(lesson),
  };
}

/** Saves (or replaces) the student's project answer for a unit in their program. */
export async function submitProject(userId: string, lessonId: string, content: string) {
  const training = await unitsTraining(userId);
  if (!training?.lessons.some((l) => l.id === lessonId)) throw new UnitError("NOT_IN_PROGRAM", 404);
  return prisma.lessonProjectSubmission.upsert({
    where: { lessonId_userId: { lessonId, userId } },
    create: { lessonId, userId, content },
    update: { content },
  });
}
