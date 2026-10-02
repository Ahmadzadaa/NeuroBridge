import { withAuthorizedHandler } from "@/lib/auth/authorize";
import { searchRecipients } from "@/lib/certificates/recipients";

/** Certificate recipients of the caller's organisation, searched by name or email. */
export async function GET(request: Request) {
  const query = (new URL(request.url).searchParams.get("q") ?? "").slice(0, 100);
  return withAuthorizedHandler(
    "participant:write",
    async ({ session }) => searchRecipients(session.tenantId!, query),
    { requireTenant: true }
  );
}
