import { NextResponse } from "next/server";
import { apiErrorResponse, authorizeApi, getAuthSession } from "@/lib/auth/authorize";
import { prisma } from "@/lib/prisma";
import { assertLessonAccess } from "@/lib/lessons/lesson-access";
import { serveVideo } from "@/lib/lessons/video-file";

/**
 * Plays a lesson's uploaded video. Participants need access to the lesson;
 * the platform team may preview any. There is no public link to the file.
 */
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    const session = await getAuthSession();
    if (session?.role === "SUPER_ADMIN") {
      await authorizeApi("platform:admin");
    } else {
      const { session: participant } = await authorizeApi("training:submit");
      await assertLessonAccess(participant, id);
    }
    const lesson = await prisma.lesson.findUnique({ where: { id }, select: { videoKey: true } });
    if (!lesson?.videoKey) return NextResponse.json({ error: "No video" }, { status: 404 });
    return await serveVideo(lesson.videoKey, request.headers.get("range"));
  } catch (error) {
    return apiErrorResponse(error);
  }
}
