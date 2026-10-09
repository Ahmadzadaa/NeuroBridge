import { prisma } from "@/lib/prisma";
import { assertFeatureEnabled } from "@/lib/tenant/features";
import { assertTrainingAccess } from "@/lib/programs/training-access";

export class LessonNotFoundError extends Error {
  readonly statusCode = 404;
  readonly code = "LESSON_NOT_FOUND";
  constructor() {
    super("Lesson not found");
    this.name = "LessonNotFoundError";
  }
}

/**
 * A participant may use a lesson only when its module is switched on for the
 * organisation and its training is part of their programme. Errors carry
 * their own status for withAuthorizedHandler's error mapper.
 */
export async function assertLessonAccess(session: { id: string; tenantId: string | null }, lessonId: string) {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { id: true, activity: true, training: { select: { key: true } } },
  });
  if (!lesson) throw new LessonNotFoundError();
  // Training units (they carry a calendar activity) belong to a simulation.
  await assertFeatureEnabled(session.tenantId, lesson.activity ? "simulations" : "trainings");
  await assertTrainingAccess({ userId: session.id, tenantId: session.tenantId, trainingKey: lesson.training.key });
  return lesson;
}
