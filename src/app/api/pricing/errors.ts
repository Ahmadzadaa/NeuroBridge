import { NextResponse } from "next/server";
import { ValidationError } from "@/lib/auth/permissions";
import { PricingError } from "@/lib/pricing";
import { PaytrApiError } from "@/lib/payment/paytr/paytr.types";
import { EmailTakenError } from "@/lib/billing/order-service";

export function mapPricingError(error: unknown, fallback: string): NextResponse {
  if (error instanceof ValidationError) {
    return NextResponse.json(
      { error: error.message, issues: error.issues },
      { status: 400 }
    );
  }
  if (error instanceof SyntaxError) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (error instanceof PricingError) {
    return NextResponse.json(
      { error: error.message, code: error.code, serviceCode: error.serviceCode },
      { status: 400 }
    );
  }
  if (error instanceof EmailTakenError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: 409 });
  }
  if (error instanceof PaytrApiError) {
    console.error(`${fallback}:`, error.message);
    return NextResponse.json(
      { error: "Payment provider unavailable", code: "PAYMENT_PROVIDER" },
      { status: 502 }
    );
  }
  console.error(`${fallback}:`, error);
  return NextResponse.json({ error: fallback }, { status: 500 });
}
