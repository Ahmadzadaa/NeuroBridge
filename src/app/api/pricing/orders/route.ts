import { NextResponse } from "next/server";
import { parseBody } from "@/lib/validation/schemas";
import { createOrderSchema } from "@/lib/billing/validators";
import { createOrder, startOrderCheckout } from "@/lib/billing/order-service";
import { getClientIp } from "@/lib/audit/audit-service";
import { enforceRateLimit, getClientIdentifier } from "@/lib/security/rate-limit";
import { mapPricingError } from "../errors";

/**
 * Public: creates a PENDING order (prices recomputed server-side) and returns
 * the PayTR payment URL. Nothing is provisioned until PayTR confirms payment.
 */
export async function POST(request: Request) {
  try {
    await enforceRateLimit("registration", getClientIdentifier(request));
  } catch {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  try {
    const input = parseBody(createOrderSchema, await request.json());
    const order = await createOrder(input);
    const checkoutUrl = await startOrderCheckout(order, getClientIp(request));
    return NextResponse.json({ checkoutUrl, orderId: order.id }, { status: 201 });
  } catch (error) {
    return mapPricingError(error, "Order failed");
  }
}
