import { NextResponse } from "next/server";
import { withAuthorizedHandler } from "@/lib/auth/authorize";
import { parseBody } from "@/lib/validation/schemas";
import { lessonVideoSchema, saveLessonVideo } from "@/lib/lessons/video-admin";
import { recordAudit, getClientIp } from "@/lib/audit/audit-service";
import { AUDIT_ACTIONS } from "@/lib/audit/actions";

/** Super admin: a lesson's video link, length and in-video questions. */
export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return withAuthorizedHandler("platform:admin", async ({ session }) => {
    const body = parseBody(lessonVideoSchema, await request.json());
    const saved = await saveLessonVideo(id, body);
    if (!saved) return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    await recordAudit({
      action: AUDIT_ACTIONS.LESSON_VIDEO_UPDATED,
      userId: session.id,
      ip: getClientIp(request),
      details: { lessonId: id, videoUrl: body.videoUrl, questions: saved.questions },
    });
    return saved;
  });
}
