import { NextResponse } from "next/server";
import { parseBody } from "@/lib/validation/schemas";
import { quoteSchema } from "@/lib/billing/validators";
import { calculateQuote } from "@/lib/pricing";
import { enforceRateLimit, getClientIdentifier } from "@/lib/security/rate-limit";
import { mapPricingError } from "../errors";

/** Public: prices a service selection for the pricing calculator. */
export async function POST(request: Request) {
  try {
    await enforceRateLimit("api", getClientIdentifier(request));
  } catch {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  try {
    const { items } = parseBody(quoteSchema, await request.json());
    return NextResponse.json(await calculateQuote(items));
  } catch (error) {
    return mapPricingError(error, "Quote failed");
  }
}
