import { setRequestLocale } from "next-intl/server";
import { requireRole } from "@/lib/auth-utils";
import { requireFeature } from "@/lib/tenant/require-feature";
import { prisma } from "@/lib/prisma";
import { localized } from "@/lib/i18n-content";
import { TrainingsClient } from "./trainings-client";

export default async function TrainingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireRole(locale, ["PARTICIPANT"]);
  await requireFeature(session.user.tenantId, "trainings");

  const [trainings, lessonProgress, examAttempts, me] = await Promise.all([
    prisma.training.findMany({
      include: {
        lessons: { select: { id: true, estimatedMinutes: true } },
        exams: {
          select: {
            id: true,
            passingThreshold: true,
            _count: { select: { questions: true } },
          },
        },
      },
    }),
    prisma.lessonProgress.findMany({
      where: { userId: session.user.id },
      select: { lessonId: true },
    }),
    prisma.examAttempt.findMany({
      where: { userId: session.user.id },
      select: { examId: true, score: true, passed: true },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { coinBalance: true },
    }),
  ]);

  const completedLessonIds = new Set(lessonProgress.map((p) => p.lessonId));
  const attemptByExam = new Map(examAttempts.map((a) => [a.examId, a]));

  const items = trainings
    .filter((t) => t.lessons.length > 0 || t.exams.length > 0)
    .map((training) => {
      const exam = training.exams[0] ?? null;
      const attempt = exam ? attemptByExam.get(exam.id) ?? null : null;
      const completedLessons = training.lessons.filter((l) =>
        completedLessonIds.has(l.id)
      ).length;

      return {
        id: training.id,
        title: localized(training, "title", locale),
        description: localized(training, "description", locale),
        category: training.category ?? "general",
        lessonCount: training.lessons.length,
        totalMinutes: training.lessons.reduce(
          (sum, l) => sum + l.estimatedMinutes,
          0
        ),
        completedLessons,
        exam: exam
          ? {
              id: exam.id,
              questionCount: exam._count.questions,
              passingThreshold: exam.passingThreshold,
              attempt: attempt
                ? { score: attempt.score, passed: attempt.passed }
                : null,
            }
          : null,
      };
    });

  return (
    <TrainingsClient
      locale={locale}
      userName={session.user.name ?? "Participant"}
      coinBalance={me?.coinBalance ?? 0}
      trainings={items}
    />
  );
}
