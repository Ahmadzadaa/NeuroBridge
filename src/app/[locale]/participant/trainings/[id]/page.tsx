import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { localized } from "@/lib/i18n-content";
import { TrainingDetailClient } from "./training-client";

export default async function TrainingDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const session = await requireRole(locale, ["PARTICIPANT"]);

  const training = await prisma.training.findUnique({
    where: { id },
    include: {
      lessons: { orderBy: { order: "asc" } },
      exams: {
        select: {
          id: true,
          passingThreshold: true,
          _count: { select: { questions: true } },
        },
      },
    },
  });

  if (!training) notFound();

  const [progress, me] = await Promise.all([
    prisma.lessonProgress.findMany({
      where: {
        userId: session.user.id,
        lessonId: { in: training.lessons.map((l) => l.id) },
      },
      select: { lessonId: true },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { coinBalance: true },
    }),
  ]);

  const exam = training.exams[0] ?? null;
  const attempt = exam
    ? await prisma.examAttempt.findUnique({
        where: {
          examId_userId: { examId: exam.id, userId: session.user.id },
        },
        select: { score: true, passed: true },
      })
    : null;

  const completedIds = new Set(progress.map((p) => p.lessonId));

  return (
    <TrainingDetailClient
      locale={locale}
      userName={session.user.name ?? "Participant"}
      coinBalance={me?.coinBalance ?? 0}
      training={{
        id: training.id,
        title: localized(training, "title", locale),
        description: localized(training, "description", locale),
      }}
      lessons={training.lessons.map((lesson) => ({
        id: lesson.id,
        title: localized(lesson, "title", locale),
        content: lesson.content,
        videoUrl: lesson.videoUrl,
        estimatedMinutes: lesson.estimatedMinutes,
        completed: completedIds.has(lesson.id),
      }))}
      exam={
        exam
          ? {
              id: exam.id,
              questionCount: exam._count.questions,
              passingThreshold: exam.passingThreshold,
              attempt,
            }
          : null
      }
    />
  );
}
