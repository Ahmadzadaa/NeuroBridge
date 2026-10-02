import { withAuthorizedHandler } from "@/lib/auth/authorize";
import { assertLessonAccess } from "@/lib/lessons/lesson-access";
import { getVideoState } from "@/lib/lessons/video-watch";

/** The lesson video's source, its questions (without answers) and the caller's progress. */
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const locale = new URL(request.url).searchParams.get("locale") ?? "az";
  return withAuthorizedHandler("training:submit", async ({ session }) => {
    await assertLessonAccess(session, id);
    return getVideoState(id, session.id, locale);
  });
}
