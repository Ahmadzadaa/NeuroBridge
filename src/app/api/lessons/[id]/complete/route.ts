import { NextResponse } from "next/server";
import { withAuthorizedHandler } from "@/lib/auth/authorize";
import { prisma } from "@/lib/prisma";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  return withAuthorizedHandler("training:submit", async ({ session }) => {
    const lesson = await prisma.lesson.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    const progress = await prisma.lessonProgress.upsert({
      where: { lessonId_userId: { lessonId: id, userId: session.id } },
      create: { lessonId: id, userId: session.id },
      update: {},
    });

    return { completed: true, completedAt: progress.completedAt };
  });
}
