import { NextResponse } from "next/server";
import { getPaymentProvider } from "@/lib/payment/provider-registry";
import { processWebhookEvent } from "@/lib/payment/webhook-processor";
import {
  PaymentConfigurationError,
  PaymentVerificationError,
} from "@/lib/payment/types";
import { enforceRateLimit, getClientIdentifier } from "@/lib/security/rate-limit";

export async function POST(request: Request) {
  try {
    await enforceRateLimit("webhook", getClientIdentifier(request));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Rate limited" },
      { status: 429 }
    );
  }

  try {
    const adapter = getPaymentProvider("PAYRIFF");
    const verified = await adapter.verifyWebhook(request);
    const result = await processWebhookEvent(
      "PAYRIFF",
      verified.eventId,
      verified.eventType,
      verified.payload
    );

    return NextResponse.json({
      received: true,
      duplicate: result.duplicate,
      processed: result.processed,
      paymentId: result.paymentId,
    });
  } catch (error) {
    if (
      error instanceof PaymentVerificationError ||
      error instanceof PaymentConfigurationError
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error("Payriff webhook processing error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
