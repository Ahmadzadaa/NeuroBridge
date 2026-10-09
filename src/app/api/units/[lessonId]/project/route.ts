import { z } from "zod";
import { withAuthorizedHandler } from "@/lib/auth/authorize";
import { assertFeatureEnabled } from "@/lib/tenant/features";
import { parseBody } from "@/lib/validation/schemas";
import { PROJECT_MAX_LENGTH, submitProject } from "@/lib/training/units-service";

const bodySchema = z.object({ content: z.string().trim().min(20).max(PROJECT_MAX_LENGTH) });

/** Student: saves the project step of a training unit (can be resubmitted). */
export async function POST(request: Request, context: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await context.params;
  return withAuthorizedHandler("training:submit", async ({ session }) => {
    await assertFeatureEnabled(session.tenantId, "simulations");
    const { content } = parseBody(bodySchema, await request.json());
    const saved = await submitProject(session.id, lessonId, content);
    return { submittedAt: saved.submittedAt, updatedAt: saved.updatedAt };
  });
}
