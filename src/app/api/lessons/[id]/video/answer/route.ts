import { z } from "zod";
import { withAuthorizedHandler } from "@/lib/auth/authorize";
import { parseBody } from "@/lib/validation/schemas";
import { assertLessonAccess } from "@/lib/lessons/lesson-access";
import { answerQuestion } from "@/lib/lessons/video-watch";
import { enforceRateLimit } from "@/lib/security/rate-limit";

const schema = z.object({
  questionId: z.string().min(1).max(50),
  choice: z.number().int().min(0).max(9),
});

/** Answers an in-video question; a wrong answer returns where to rewatch from. */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return withAuthorizedHandler("training:submit", async ({ session }) => {
    await enforceRateLimit("api", session.id);
    const body = parseBody(schema, await request.json());
    await assertLessonAccess(session, id);
    return answerQuestion(id, body.questionId, session.id, body.choice);
  });
}
