import { NextResponse } from "next/server";
import { withAuthorizedHandler } from "@/lib/auth/authorize";
import { parseBody } from "@/lib/validation/schemas";
import { getClientIp } from "@/lib/audit/audit-service";
import { changeSeatsSchema } from "@/lib/billing/validators";
import { requestSeatChange } from "@/lib/billing/seat-change-service";
import { createSeatCheckout } from "@/lib/billing/checkout-service";
import { prisma } from "@/lib/prisma";

/**
 * Changes the seat count.
 *
 * An increase returns a payment URL and applies nothing yet — seats move only
 * once the invoice is paid. A decrease is scheduled for the end of the current
 * period and is not refunded.
 */
export async function POST(request: Request) {
  return withAuthorizedHandler(
    "billing:write",
    async ({ session }) => {
      if (!session.tenantId) {
        return NextResponse.json({ error: "Tenant required" }, { status: 400 });
      }

      const body = parseBody(changeSeatsSchema, await request.json());

      const result = await requestSeatChange({
        tenantId: session.tenantId,
        requestedSeats: body.seats,
        actorId: session.id,
      });

      if (result.applied) {
        return {
          direction: result.preview.direction,
          applied: true,
          effectiveAt: result.preview.effectiveAt,
          currentSeats: result.preview.currentSeats,
          scheduledSeats: result.preview.requestedSeats,
          nextPeriodAmount: result.preview.nextPeriodAmount,
        };
      }

      const invoice = await prisma.invoice.findUniqueOrThrow({
        where: { id: result.invoiceId },
      });

      const checkout = await createSeatCheckout({
        invoice,
        customerEmail: session.email,
        userIp: getClientIp(request),
      });

      return {
        direction: result.preview.direction,
        applied: false,
        invoiceId: invoice.id,
        amountDue: result.preview.amountDue,
        currency: result.preview.currency,
        seatDelta: result.preview.seatDelta,
        daysRemaining: result.preview.daysRemaining,
        daysInPeriod: result.preview.daysInPeriod,
        ...checkout,
      };
    },
    { requireTenant: true }
  );
}
