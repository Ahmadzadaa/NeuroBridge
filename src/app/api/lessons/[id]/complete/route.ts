import { NextResponse } from "next/server";
import { withAuthorizedHandler } from "@/lib/auth/authorize";
import { assertFeatureEnabled } from "@/lib/tenant/features";
import { prisma } from "@/lib/prisma";
import {
  assertTrainingAccess,
} from "@/lib/programs/training-access";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  return withAuthorizedHandler("training:submit", async ({ session }) => {
    const lesson = await prisma.lesson.findUnique({
      where: { id },
      select: { id: true, activity: true, training: { select: { key: true } } },
    });

    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }
    // Training units (they carry a calendar activity) belong to a simulation.
    await assertFeatureEnabled(session.tenantId, lesson.activity ? "simulations" : "trainings");

    // Thrown as TrainingNotAssignedError, which carries its own 403 and code;
    // withAuthorizedHandler's error mapper turns it into the response.
    await assertTrainingAccess({
      userId: session.id,
      tenantId: session.tenantId,
      trainingKey: lesson.training.key,
    });

    const progress = await prisma.lessonProgress.upsert({
      where: { lessonId_userId: { lessonId: id, userId: session.id } },
      create: { lessonId: id, userId: session.id },
      update: {},
    });

    return { completed: true, completedAt: progress.completedAt };
  });
}
