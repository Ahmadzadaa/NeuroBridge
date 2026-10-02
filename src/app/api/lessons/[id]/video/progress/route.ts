import { z } from "zod";
import { withAuthorizedHandler } from "@/lib/auth/authorize";
import { parseBody } from "@/lib/validation/schemas";
import { assertLessonAccess } from "@/lib/lessons/lesson-access";
import { recordHeartbeat } from "@/lib/lessons/video-watch";

const schema = z.object({
  position: z.number().min(0).max(36_000),
  duration: z.number().min(0).max(36_000),
});

/** Playback heartbeat; the server decides how far the video really counts as watched. */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return withAuthorizedHandler("training:submit", async ({ session }) => {
    const body = parseBody(schema, await request.json());
    await assertLessonAccess(session, id);
    return recordHeartbeat(id, session.id, body);
  });
}
