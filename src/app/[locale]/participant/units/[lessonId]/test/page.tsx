import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth-utils";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { localized } from "@/lib/i18n-content";
import { getUnit, UnitError } from "@/lib/training/units-service";
import { ExamClient } from "../../../trainings/[id]/exam/exam-client";

export async function generateMetadata({ params }: { params: Promise<{ locale: string; lessonId: string }> }) {
  const { locale, lessonId } = await params;
  const session = await auth();
  const unit = session?.user ? await getUnit(session.user.id, lessonId, locale).catch(() => null) : null;
  return { title: `${unit?.title ?? "BizSim"} · BizSim` };
}

/** A unit's 10-question test, using the shared exam screen and grading API. */
export default async function UnitTestPage({ params }: { params: Promise<{ locale: string; lessonId: string }> }) {
  const { locale, lessonId } = await params;
  setRequestLocale(locale);
  const session = await requireRole(locale, ["PARTICIPANT"]);

  const unit = await getUnit(session.user.id, lessonId, locale).catch((error) => {
    if (error instanceof UnitError) notFound();
    throw error;
  });
  if (!unit.examId) notFound();

  const [exam, attempt, me] = await Promise.all([
    prisma.exam.findUniqueOrThrow({
      where: { id: unit.examId },
      include: {
        // Deliberately excludes correctOption — grading is server-side only.
        questions: {
          orderBy: { order: "asc" },
          select: { id: true, questionText: true, optionA: true, optionB: true, optionC: true, optionD: true },
        },
      },
    }),
    prisma.examAttempt.findUnique({
      where: { examId_userId: { examId: unit.examId, userId: session.user.id } },
      select: { score: true, passed: true },
    }),
    prisma.user.findUnique({ where: { id: session.user.id }, select: { coinBalance: true } }),
  ]);

  return (
    <ExamClient
      locale={locale}
      userName={session.user.name ?? ""}
      coinBalance={me?.coinBalance ?? 0}
      trainingId={exam.trainingId}
      backHref={`/${locale}/participant/units/${unit.id}`}
      examTitle={localized(exam, "title", locale)}
      examId={exam.id}
      passingThreshold={exam.passingThreshold}
      previousAttempt={attempt}
      questions={exam.questions}
    />
  );
}
