import { NextResponse } from "next/server";
import { withAuthorizedHandler } from "@/lib/auth/authorize";
import { parseBody } from "@/lib/validation/schemas";
import { getClientIp } from "@/lib/audit/audit-service";
import { createSubscriptionSchema } from "@/lib/billing/validators";
import {
  createSubscription,
  getSubscription,
} from "@/lib/billing/subscription-service";
import { createInvoice } from "@/lib/billing/invoice-service";
import { getSeatAvailability } from "@/lib/billing/seat-guard";
import { createSeatCheckout } from "@/lib/billing/checkout-service";

/** Current subscription plus live seat usage. */
export async function GET() {
  return withAuthorizedHandler(
    "billing:read",
    async ({ session }) => {
      if (!session.tenantId) {
        return NextResponse.json({ error: "Tenant required" }, { status: 400 });
      }

      const [subscription, seats] = await Promise.all([
        getSubscription(session.tenantId),
        getSeatAvailability(session.tenantId),
      ]);

      return { subscription, seats };
    },
    { requireTenant: true }
  );
}

/**
 * Starts a subscription and returns a PayTR payment URL for the first period.
 * The subscription exists immediately but seats only take effect once the
 * invoice is paid.
 */
export async function POST(request: Request) {
  return withAuthorizedHandler(
    "billing:write",
    async ({ session }) => {
      if (!session.tenantId) {
        return NextResponse.json({ error: "Tenant required" }, { status: 400 });
      }

      const body = parseBody(createSubscriptionSchema, await request.json());

      const { subscription, amountDue, period } = await createSubscription({
        tenantId: session.tenantId,
        planId: body.planId,
        seats: body.seats,
        actorId: session.id,
      });

      const invoice = await createInvoice({
        tenantId: session.tenantId,
        subscriptionId: subscription.id,
        amount: amountDue,
        currency: subscription.currency,
        type: "SUBSCRIPTION",
        seatCount: body.seats,
        periodStart: period.start,
        periodEnd: period.end,
        actorId: session.id,
      });

      const checkout = await createSeatCheckout({
        invoice,
        customerEmail: session.email,
        userIp: getClientIp(request),
      });

      return {
        subscriptionId: subscription.id,
        invoiceId: invoice.id,
        amountDue,
        currency: subscription.currency,
        periodEnd: period.end,
        ...checkout,
      };
    },
    { requireTenant: true }
  );
}
