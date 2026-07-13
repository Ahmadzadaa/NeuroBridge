import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { localized } from "@/lib/i18n-content";
import { ExamClient } from "./exam-client";

export default async function ExamPage({
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
      exams: {
        include: {
          // Deliberately excludes correctOption/explanation — grading is server-side only.
          questions: {
            orderBy: { order: "asc" },
            select: {
              id: true,
              questionText: true,
              optionA: true,
              optionB: true,
              optionC: true,
              optionD: true,
            },
          },
        },
      },
    },
  });

  const exam = training?.exams[0];
  if (!training || !exam || exam.questions.length === 0) notFound();

  const [attempt, me] = await Promise.all([
    prisma.examAttempt.findUnique({
      where: { examId_userId: { examId: exam.id, userId: session.user.id } },
      select: { score: true, passed: true },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { coinBalance: true },
    }),
  ]);

  return (
    <ExamClient
      locale={locale}
      userName={session.user.name ?? "Participant"}
      coinBalance={me?.coinBalance ?? 0}
      trainingId={training.id}
      examTitle={localized(exam, "title", locale)}
      examId={exam.id}
      passingThreshold={exam.passingThreshold}
      previousAttempt={attempt}
      questions={exam.questions}
    />
  );
}
