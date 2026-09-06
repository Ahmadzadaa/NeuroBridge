import { getClientIp } from "@/lib/audit/audit-service";
import { processWebhookEvent } from "@/lib/payment/webhook-processor";
import { processPaytrCallback } from "@/lib/billing/callback-service";
import {
  completePaytrCallback,
  recordPaytrCallback,
} from "@/lib/billing/paytr-callback-log";
import {
  readPaytrCallback,
  verifyPaytrCallback,
} from "@/lib/payment/paytr-provider";
import { getPaytrCredentials, getPaytrMode } from "@/lib/payment/paytr/paytr.config";
import { logPaytr } from "@/lib/payment/paytr/paytr-log";
import { PaymentVerificationError } from "@/lib/payment/types";
import type { PaytrCallbackPayload } from "@/lib/payment/paytr/paytr.types";

/**
 * PayTR payment notification (iFrame API, step 2).
 *
 * This endpoint is deliberately outside auth and rate limiting: PayTR calls it
 * server-to-server and cannot present a session. Authenticity comes from the
 * HMAC hash over the raw body instead, which is verified before anything is
 * written to the billing tables.
 *
 * PayTR retries until it receives exactly "OK", so every path that has fully
 * handled (or safely ignored) a notification returns that literal body. A
 * non-OK response is reserved for cases where a retry is genuinely wanted.
 *
 * Every delivery is written to `paytr_webhook_events` first — including ones
 * rejected for a bad hash — because the questions asked about a disputed
 * payment are about the calls we refused as much as the ones we accepted.
 */

export const dynamic = "force-dynamic";

function ok(): Response {
  return new Response("OK", {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

function currentMode(): string {
  try {
    return getPaytrMode();
  } catch {
    // An unreadable PAYTR_MODE must still leave a usable log line.
    return "invalid";
  }
}

export async function POST(request: Request): Promise<Response> {
  const startedAt = Date.now();
  const remoteIp = getClientIp(request);
  const mode = currentMode();

  const { rawBody, fields } = await readPaytrCallback(request);
  const merchantOid = fields.merchant_oid ?? "";

  logPaytr("info", "callback.received", {
    merchantOid,
    mode,
    remoteIp,
    status: fields.status,
    bodyBytes: rawBody.length,
  });

  let verified;
  try {
    verified = verifyPaytrCallback(getPaytrCredentials(), fields, rawBody);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "PayTR callback verification failed";

    if (error instanceof PaymentVerificationError) {
      // The request did not come from PayTR. Record it for forensics — this is
      // the only trace an attempted forgery leaves — but write no payment state.
      logPaytr("warn", "callback.rejected", {
        merchantOid,
        mode,
        remoteIp,
        hashValid: false,
        reason: message,
        durationMs: Date.now() - startedAt,
      });

      await recordPaytrCallback({
        merchantOid,
        fields,
        rawBody,
        hashValid: false,
        mode,
        remoteIp,
        outcome: "REJECTED",
        errorMessage: message,
      });

      return new Response("Invalid hash", { status: 400 });
    }

    // Configuration problems are ours, not PayTR's — let it retry later.
    logPaytr("error", "callback.failed", {
      merchantOid,
      mode,
      remoteIp,
      reason: message,
      outcome: "CONFIG_ERROR",
    });

    await recordPaytrCallback({
      merchantOid,
      fields,
      rawBody,
      hashValid: false,
      mode,
      remoteIp,
      outcome: "ERROR",
      errorMessage: message,
    });

    return new Response("Configuration error", { status: 503 });
  }

  const logId = await recordPaytrCallback({
    merchantOid,
    fields,
    rawBody,
    hashValid: true,
    mode,
    remoteIp,
    outcome: "RECEIVED",
  });

  try {
    const payload = verified.payload.raw as PaytrCallbackPayload;

    try {
      const result = await processPaytrCallback(payload);

      if (result.inFlight) {
        // A concurrent delivery holds the claim. Returning OK here would let
        // PayTR drop a notification the other request might still fail on.
        await completePaytrCallback(logId, "IN_FLIGHT");
        logPaytr("info", "callback.duplicate", {
          merchantOid,
          mode,
          outcome: "IN_FLIGHT",
          durationMs: Date.now() - startedAt,
        });
        return new Response("Processing", { status: 409 });
      }

      await completePaytrCallback(logId, result.duplicate ? "DUPLICATE" : "PROCESSED");
      logPaytr("info", result.duplicate ? "callback.duplicate" : "callback.processed", {
        merchantOid,
        mode,
        hashValid: true,
        invoiceId: result.invoiceId,
        seatsApplied: result.seatsApplied,
        durationMs: Date.now() - startedAt,
      });
    } catch (billingError) {
      // Invoices are the current billing path; the legacy Payment flow still
      // exists for orders placed before it, so fall back rather than fail.
      const unknownOrder =
        billingError instanceof Error &&
        billingError.message.startsWith("No invoice for merchant_oid");

      if (!unknownOrder) throw billingError;

      logPaytr("warn", "callback.unmatched", { merchantOid, mode });

      await processWebhookEvent(
        "PAYTR",
        verified.eventId,
        verified.eventType,
        verified.payload
      );

      await completePaytrCallback(logId, "PROCESSED");
    }

    return ok();
  } catch (error) {
    // The signature was valid, so the notification is genuine. If we cannot
    // apply it yet (e.g. the payment row is missing), returning OK would make
    // PayTR drop it forever — so ask for a retry instead.
    const message = error instanceof Error ? error.message : "Unknown error";

    logPaytr("error", "callback.failed", {
      merchantOid,
      mode,
      hashValid: true,
      reason: message,
      durationMs: Date.now() - startedAt,
    });

    await completePaytrCallback(
      logId,
      message.startsWith("Payment record not found") ? "UNMATCHED" : "ERROR",
      message
    );

    return new Response("Processing error", { status: 500 });
  }
}
