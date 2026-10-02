import { NextResponse } from "next/server";
import type { ReadableStream as WebReadableStream } from "stream/web";
import { withAuthorizedHandler } from "@/lib/auth/authorize";
import { prisma } from "@/lib/prisma";
import { deleteVideo, storeVideo, videoKeyFor } from "@/lib/lessons/video-file";
import { recordAudit, getClientIp } from "@/lib/audit/audit-service";
import { AUDIT_ACTIONS } from "@/lib/audit/actions";

const notFound = () => NextResponse.json({ error: "Lesson not found" }, { status: 404 });

/**
 * Super admin: uploads a lesson's video file. The body is the raw file,
 * streamed to storage; `?duration=` carries its length as the browser read it.
 */
export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return withAuthorizedHandler("platform:admin", async ({ session }) => {
    const lesson = await prisma.lesson.findUnique({ where: { id }, select: { videoKey: true } });
    if (!lesson) return notFound();
    if (!request.body) return NextResponse.json({ error: "Empty upload", code: "LENGTH_REQUIRED" }, { status: 411 });

    const contentType = (request.headers.get("content-type") ?? "").split(";")[0].trim();
    const size = Number(request.headers.get("content-length"));
    const key = videoKeyFor(id, contentType);
    await storeVideo(key, request.body as WebReadableStream<Uint8Array>, contentType, size);

    const duration = Math.round(Number(new URL(request.url).searchParams.get("duration")));
    await prisma.lesson.update({
      where: { id },
      data: { videoKey: key, ...(duration > 0 && duration <= 36_000 ? { videoDurationSec: duration } : {}) },
    });
    if (lesson.videoKey) await deleteVideo(lesson.videoKey);
    await recordAudit({
      action: AUDIT_ACTIONS.LESSON_VIDEO_UPDATED,
      userId: session.id,
      ip: getClientIp(request),
      details: { lessonId: id, videoFile: key, size },
    });
    return { videoKey: key, durationSec: duration > 0 ? duration : null };
  });
}

/** Super admin: removes the uploaded file; a YouTube link, if set, plays again. */
export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return withAuthorizedHandler("platform:admin", async ({ session }) => {
    const lesson = await prisma.lesson.findUnique({ where: { id }, select: { videoKey: true } });
    if (!lesson) return notFound();
    if (lesson.videoKey) {
      await prisma.lesson.update({ where: { id }, data: { videoKey: null } });
      await deleteVideo(lesson.videoKey);
      await recordAudit({
        action: AUDIT_ACTIONS.LESSON_VIDEO_UPDATED,
        userId: session.id,
        ip: getClientIp(request),
        details: { lessonId: id, videoFileRemoved: lesson.videoKey },
      });
    }
    return { ok: true };
  });
}
