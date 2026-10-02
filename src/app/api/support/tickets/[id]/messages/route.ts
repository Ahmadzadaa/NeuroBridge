import { after } from "next/server";
import { withAuthorizedHandler } from "@/lib/auth/authorize";
import { getAppOrigin } from "@/lib/app-url";
import { notifyReply } from "@/lib/support/support-notify";
import { parseBody } from "@/lib/validation/schemas";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { addMessage, messageSchema } from "@/lib/support/support-service";

/** An organisation admin replies in a support conversation. */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return withAuthorizedHandler(
    "support:write",
    async ({ session }) => {
      await enforceRateLimit("api", session.id);
      const { body } = parseBody(messageSchema, await request.json());
      await addMessage(session, id, body);
      // The other side hears about it after the response, so the writer never waits on mail.
      const origin = await getAppOrigin();
      after(() => notifyReply(id, false, origin));
      return { ok: true };
    }, { requireTenant: true }
  );
}
