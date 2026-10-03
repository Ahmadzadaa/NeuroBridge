import { withAuthorizedHandler } from "@/lib/auth/authorize";
import { getAppOrigin } from "@/lib/app-url";
import { issueActivationLink } from "@/lib/onboarding/activation-link";
import { recordAudit, getClientIp } from "@/lib/audit/audit-service";
import { AUDIT_ACTIONS } from "@/lib/audit/actions";

/** Platform team: a new set-password link for an organisation admin who has not activated yet. */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return withAuthorizedHandler("platform:admin", async ({ session }) => {
    const result = await issueActivationLink(id, await getAppOrigin());
    // The link itself is a credential: it is never written to the audit log.
    await recordAudit({
      action: AUDIT_ACTIONS.ACTIVATION_LINK_ISSUED,
      userId: session.id,
      tenantId: id,
      ip: getClientIp(request),
      details: { email: result.email, emailed: result.emailed },
    });
    return result;
  });
}
