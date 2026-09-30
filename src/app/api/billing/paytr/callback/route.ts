import { getPaymentProvider } from "@/lib/payment/provider-registry";
import { processWebhookEvent } from "@/lib/payment/webhook-processor";
import { processPaytrCallback } from "@/lib/billing/callback-service";
import { PaymentVerificationError } from "@/lib/payment/types";
import type { PaytrCallbackPayload } from "@/lib/payment/paytr/paytr.types";
import { prisma } from "@/lib/prisma";
import { ORDER_MERCHANT_OID_PREFIX } from "@/lib/payment/paytr/paytr.hash";
import { processOrderCallback } from "@/lib/onboarding/order-provisioning";

/**
 * PayTR payment notification (iFrame API, step 2).
 *
 * This endpoint is deliberately outside auth and rate limiting: PayTR calls it
 * server-to-server and cannot present a session. Authenticity comes from the
 * HMAC hash instead, which is verified before anything is written.
 *
 * PayTR retries until it receives exactly "OK", so every path that has fully
 * handled (or safely ignored) a notification returns that literal body. A
 * non-OK response is reserved for cases where a retry is genuinely wanted.
 */

export const dynamic = "force-dynamic";

const OK = new Response("OK", {
  status: 200,
  headers: { "Content-Type": "text/plain; charset=utf-8" },
});

function ok(): Response {
  return OK.clone();
}

export async function POST(request: Request): Promise<Response> {
  const provider = getPaymentProvider("PAYTR");

  let verified;
  try {
    verified = await provider.verifyWebhook(request);
  } catch (error) {
    // An invalid hash means the request did not come from PayTR. Record the
    // rejection for forensics, but never write payment state from it.
    const message =
      error instanceof Error ? error.message : "PayTR callback verification failed";
    console.error("PayTR callback rejected:", message);

    if (error instanceof PaymentVerificationError) {
      await prisma.webhookEvent
        .create({
          data: {
            provider: "PAYTR",
            externalEventId: `invalid-${Date.now()}`,
            eventType: "paytr.invalid",
            status: "FAILED",
            signatureValid: false,
            errorMessage: message,
          },
        })
        .catch(() => undefined);

      return new Response("Invalid hash", { status: 400 });
    }

    // Configuration problems are ours, not PayTR's — let it retry later.
    return new Response("Configuration error", { status: 503 });
  }

  try {
    const payload = verified.payload.raw as PaytrCallbackPayload;

    // Self-serve orders (ORD…) have no tenant yet; they provision one.
    if (payload.merchant_oid.startsWith(ORDER_MERCHANT_OID_PREFIX)) {
      await processOrderCallback(payload);
      return ok();
    }

    try {
      await processPaytrCallback(payload);
    } catch (billingError) {
      // Invoices are the current billing path; the legacy Payment flow still
      // exists for orders placed before it, so fall back rather than fail.
      const unknownOrder =
        billingError instanceof Error &&
        billingError.message.startsWith("No invoice for merchant_oid");

      if (!unknownOrder) throw billingError;

      await processWebhookEvent(
        "PAYTR",
        verified.eventId,
        verified.eventType,
        verified.payload
      );
    }

    return ok();
  } catch (error) {
    // The signature was valid, so the notification is genuine. If we cannot
    // apply it yet (e.g. the payment row is missing), returning OK would make
    // PayTR drop it forever — so ask for a retry instead.
    console.error(
      "PayTR callback processing failed:",
      error instanceof Error ? error.message : error
    );
    return new Response("Processing error", { status: 500 });
  }
}
