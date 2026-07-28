import { NextResponse } from "next/server";
import { withAuthorizedHandler } from "@/lib/auth/authorize";
import { cancelSubscription } from "@/lib/billing/subscription-service";

/**
 * Cancels the subscription. Access continues until the end of the period that
 * has already been paid for; nothing is refunded and no data is removed.
 */
export async function POST() {
  return withAuthorizedHandler(
    "billing:write",
    async ({ session }) => {
      if (!session.tenantId) {
        return NextResponse.json({ error: "Tenant required" }, { status: 400 });
      }

      const result = await cancelSubscription(session.tenantId, session.id);

      return {
        status: result.subscription.status,
        accessUntil: result.accessUntil,
      };
    },
    { requireTenant: true }
  );
}
