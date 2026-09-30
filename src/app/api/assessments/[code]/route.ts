import { z } from "zod";
import { withAuthorizedHandler } from "@/lib/auth/authorize";
import { AuthorizationError } from "@/lib/auth/permissions";
import { parseBody } from "@/lib/validation/schemas";
import { submitAssessment } from "@/lib/assessments/assessment-service";

const bodySchema = z.object({
  answers: z.record(z.string().max(50), z.number().int().min(0).max(10)),
});

/** Student: submits a baseline test. Scored on the server; answers only, no scores accepted. */
export async function POST(request: Request, context: { params: Promise<{ code: string }> }) {
  const { code } = await context.params;
  return withAuthorizedHandler("training:submit", async ({ session }) => {
    if (session.role !== "PARTICIPANT") throw new AuthorizationError("Only students take baseline tests");
    const { answers } = parseBody(bodySchema, await request.json());
    return submitAssessment(session.id, code, answers);
  });
}
