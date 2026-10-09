import { NextResponse } from "next/server";
import { withAuthorizedHandler } from "@/lib/auth/authorize";
import { prisma } from "@/lib/prisma";
import { assertLessonAccess } from "@/lib/lessons/lesson-access";
import { videoRequirementMet } from "@/lib/lessons/video-watch";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  return withAuthorizedHandler("training:submit", async ({ session }) => {
    // Feature and programme checks throw errors that carry their own status.
    await assertLessonAccess(session, id);

    // A lesson with a tracked video is complete only once it was really watched.
    if (!(await videoRequirementMet(id, session.id))) {
      return NextResponse.json(
        { error: "Watch the whole video first", code: "VIDEO_NOT_WATCHED" },
        { status: 409 }
      );
    }

    const progress = await prisma.lessonProgress.upsert({
      where: { lessonId_userId: { lessonId: id, userId: session.id } },
      create: { lessonId: id, userId: session.id },
      update: {},
    });

    return { completed: true, completedAt: progress.completedAt };
  });
}
