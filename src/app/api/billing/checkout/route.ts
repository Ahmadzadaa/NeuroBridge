import { NextResponse } from "next/server";
import { withAuthorizedHandler } from "@/lib/auth/authorize";
import { checkoutSchema, parseBody } from "@/lib/validation/schemas";
import { createSeatPurchaseCheckout } from "@/lib/payment/payment-service";
import { PaymentConfigurationError } from "@/lib/payment/types";
import { enforceRateLimit, getClientIdentifier } from "@/lib/security/rate-limit";
import { recordAudit, getClientIp } from "@/lib/audit/audit-service";
import { AUDIT_ACTIONS } from "@/lib/audit/actions";

export async function POST(request: Request) {
  try {
    await enforceRateLimit("api", getClientIdentifier(request));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Rate limited" },
      { status: 429 }
    );
  }

  return withAuthorizedHandler(
    "billing:write",
    async ({ session }) => {
      if (!session.tenantId) {
        return NextResponse.json({ error: "Tenant required" }, { status: 400 });
      }

      const body = parseBody(checkoutSchema, await request.json());
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

      try {
        const checkout = await createSeatPurchaseCheckout({
          tenantId: session.tenantId,
          seatCount: body.seatCount,
          provider: body.provider,
          customerEmail: session.email,
          successUrl: `${appUrl}/tenant/billing`,
          cancelUrl: `${appUrl}/tenant/billing`,
          userIp: getClientIp(request),
        });

        await recordAudit({
          action: AUDIT_ACTIONS.PAYMENT_INITIATED,
          userId: session.id,
          tenantId: session.tenantId,
          ip: getClientIp(request),
          details: {
            paymentId: checkout.paymentId,
            seatCount: checkout.seatCount,
            provider: body.provider,
            amount: checkout.amount,
          },
        });

        return checkout;
      } catch (error) {
        if (error instanceof PaymentConfigurationError) {
          return NextResponse.json({ error: error.message }, { status: 503 });
        }
        throw error;
      }
    },
    { requireTenant: true }
  );
}
