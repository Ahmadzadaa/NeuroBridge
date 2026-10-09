import { withAuthorizedHandler } from "@/lib/auth/authorize";
import { resendOrderActivation } from "@/lib/onboarding/order-provisioning";
import { recordAudit, getClientIp } from "@/lib/audit/audit-service";
import { AUDIT_ACTIONS } from "@/lib/audit/actions";

/** Super admin: emails a fresh activation link for a paid order's admin. */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return withAuthorizedHandler("platform:admin", async ({ session }) => {
    const result = await resendOrderActivation(id);
    await recordAudit({
      action: AUDIT_ACTIONS.ACTIVATION_RESENT,
      userId: session.id,
      ip: getClientIp(request),
      details: { orderId: id, emailSent: result.emailSent },
    });
    return result;
  });
}
