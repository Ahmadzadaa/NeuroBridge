import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuthorizedHandler } from "@/lib/auth/authorize";
import { parseBody } from "@/lib/validation/schemas";
import { createOrderSchema } from "@/lib/billing/validators";
import { createProgramOrder, startOrderCheckout } from "@/lib/billing/order-service";
import { prisma } from "@/lib/prisma";
import { getClientIp } from "@/lib/audit/audit-service";
import { mapPricingError } from "@/app/api/pricing/errors";

const programOrderSchema = z.object({
  locale: createOrderSchema.shape.locale,
  currency: createOrderSchema.shape.currency,
  items: createOrderSchema.shape.items,
});

/**
 * A tenant admin buys another programme. Programmes cannot be opened for free:
 * this is the only way an organisation gets a new one, and it only exists
 * once PayTR confirms the payment.
 */
export async function POST(request: Request) {
  return withAuthorizedHandler(
    "billing:write",
    async ({ session }) => {
      const input = parseBody(programOrderSchema, await request.json());
      const tenant = await prisma.tenant.findUnique({
        where: { id: session.tenantId! },
        select: { id: true, name: true },
      });
      if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

      try {
        const order = await createProgramOrder({
          tenantId: tenant.id,
          institutionName: tenant.name,
          contactName: session.name ?? tenant.name,
          contactEmail: session.email,
          locale: input.locale,
          currency: input.currency,
          items: input.items,
        });
        const checkoutUrl = await startOrderCheckout(order, getClientIp(request));
        return NextResponse.json({ checkoutUrl, orderId: order.id }, { status: 201 });
      } catch (error) {
        return mapPricingError(error, "Order failed");
      }
    },
    { requireTenant: true }
  );
}
