import { NextResponse } from "next/server";
import { withAuthorizedHandler } from "@/lib/auth/authorize";
import { examAttemptSchema, parseBody } from "@/lib/validation/schemas";
import { prisma } from "@/lib/prisma";

const EXAM_PASS_COIN_REWARD = 50;

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  return withAuthorizedHandler("training:submit", async ({ session }) => {
    const body = parseBody(examAttemptSchema, await request.json());

    const exam = await prisma.exam.findUnique({
      where: { id },
      include: { questions: { orderBy: { order: "asc" } } },
    });

    if (!exam || exam.questions.length === 0) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    }

    const results = exam.questions.map((q) => {
      const answer = body.answers[q.id] ?? null;
      return {
        questionId: q.id,
        yourAnswer: answer,
        correctOption: q.correctOption,
        correct: answer === q.correctOption,
        explanation: q.explanation,
      };
    });

    const correctCount = results.filter((r) => r.correct).length;
    const score = Math.round((correctCount / exam.questions.length) * 100);
    const passed = score >= exam.passingThreshold;

    const previous = await prisma.examAttempt.findUnique({
      where: { examId_userId: { examId: exam.id, userId: session.id } },
    });

    // Keep the best result; coins are awarded once, on the first pass.
    const firstPass = passed && !previous?.passed;
    const bestScore = Math.max(score, previous?.score ?? 0);
    const everPassed = passed || (previous?.passed ?? false);

    await prisma.$transaction(async (tx) => {
      await tx.examAttempt.upsert({
        where: { examId_userId: { examId: exam.id, userId: session.id } },
        create: { examId: exam.id, userId: session.id, score, passed },
        update: { score: bestScore, passed: everPassed, completedAt: new Date() },
      });

      if (firstPass) {
        await tx.user.update({
          where: { id: session.id },
          data: { coinBalance: { increment: EXAM_PASS_COIN_REWARD } },
        });
        await tx.coinTransaction.create({
          data: {
            userId: session.id,
            amount: EXAM_PASS_COIN_REWARD,
            reason: `EXAM_PASSED:${exam.id}`,
          },
        });
      }
    });

    return {
      score,
      passed,
      passingThreshold: exam.passingThreshold,
      correctCount,
      totalQuestions: exam.questions.length,
      coinsAwarded: firstPass ? EXAM_PASS_COIN_REWARD : 0,
      bestScore,
      results,
    };
  });
}
