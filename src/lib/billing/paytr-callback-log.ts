import { prisma } from "@/lib/prisma";
import { sanitizeRawFormBody } from "@/lib/payment/paytr/paytr-log";

/**
 * Writes the append-only record of a PayTR notification.
 *
 * Separate from `webhook_events`, which holds one row per order because that is
 * what makes the callback idempotent. This table holds one row per HTTP
 * request — duplicates and rejected hashes included — because those are what a
 * disputed payment turns on: "PayTR says they notified us three times" is only
 * answerable if all three were written down.
 *
 * The row is created before the payload is acted on and completed afterwards,
 * so a crash mid-processing still leaves evidence that the call arrived.
 */

export type PaytrCallbackOutcome =
  | "RECEIVED"
  | "PROCESSED"
  | "DUPLICATE"
  | "REJECTED"
  | "UNMATCHED"
  | "IN_FLIGHT"
  | "ERROR";

export interface RecordCallbackInput {
  merchantOid: string;
  fields: Record<string, string>;
  rawBody: string;
  hashValid: boolean;
  mode: string;
  remoteIp?: string;
  outcome: PaytrCallbackOutcome;
  errorMessage?: string;
}

/**
 * Never throws. Losing the audit row must not turn a payment we could have
 * settled into a failed callback — the log exists to explain payments, not to
 * gate them.
 */
export async function recordPaytrCallback(
  input: RecordCallbackInput
): Promise<string | null> {
  try {
    const row = await prisma.paytrWebhookEvent.create({
      data: {
        merchantOid: input.merchantOid || "unknown",
        status: input.fields.status ?? null,
        hashValid: input.hashValid,
        mode: input.mode,
        totalAmount: input.fields.total_amount ?? null,
        paymentType: input.fields.payment_type ?? null,
        failedReasonCode: input.fields.failed_reason_code ?? null,
        failedReasonMsg: input.fields.failed_reason_msg ?? null,
        outcome: input.outcome,
        errorMessage: input.errorMessage ?? null,
        remoteIp: input.remoteIp ?? null,
        // Masked, not verbatim: a stored callback hash is replayable signing
        // material, and card handles can charge a card.
        rawPayload: sanitizeRawFormBody(input.rawBody),
      },
      select: { id: true },
    });
    return row.id;
  } catch (error) {
    console.error(
      "Could not record PayTR callback:",
      error instanceof Error ? error.message : error
    );
    return null;
  }
}

export async function completePaytrCallback(
  id: string | null,
  outcome: PaytrCallbackOutcome,
  errorMessage?: string
): Promise<void> {
  if (!id) return;
  await prisma.paytrWebhookEvent
    .update({
      where: { id },
      data: {
        outcome,
        errorMessage: errorMessage ?? null,
        processedAt: new Date(),
      },
    })
    .catch(() => undefined);
}
