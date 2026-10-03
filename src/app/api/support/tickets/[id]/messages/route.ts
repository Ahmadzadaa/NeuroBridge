import { after } from "next/server";
import { withAuthorizedHandler } from "@/lib/auth/authorize";
import { getAppOrigin } from "@/lib/app-url";
import { notifyReply } from "@/lib/support/support-notify";
import { parseBody } from "@/lib/validation/schemas";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { addMessage, messageSchema } from "@/lib/support/support-service";
import { checkFiles, readMessageRequest } from "@/lib/support/attachments";

/** An organisation admin replies in a support conversation. */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return withAuthorizedHandler(
    "support:write",
    async ({ session }) => {
      await enforceRateLimit("api", session.id);
      const { fields, files } = await readMessageRequest(request);
      const { body } = parseBody(messageSchema, fields);
      await addMessage(session, id, body, await checkFiles(files));
      // The other side hears about it after the response, so the writer never waits on mail.
      const origin = await getAppOrigin();
      after(() => notifyReply(id, false, origin));
      return { ok: true };
    }, { requireTenant: true }
  );
}
