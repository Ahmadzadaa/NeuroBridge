import { prisma } from "@/lib/prisma";
import {
  findInvoiceByMerchantOid,
  markInvoiceFailed,
  markInvoicePaid,
} from "@/lib/billing/invoice-service";
import type { PaytrCallbackPayload } from "@/lib/payment/paytr/paytr.types";

/**
 * Applies a PayTR notification whose hash has already been verified.
 *
 * Idempotency is enforced by the unique `(provider, externalEventId)` index on
 * `webhook_events`, with `merchant_oid` as the event id: PayTR retries until it
 * sees "OK", so the same notification will arrive more than once and must
 * never grant seats twice.
 */

export interface CallbackResult {
  handled: boolean;
  duplicate: boolean;
  /** Another delivery of the same notification is mid-flight. */
  inFlight?: boolean;
  invoiceId?: string;
  seatsApplied?: boolean;
}

/**
 * How long a claimed-but-unfinished notification blocks a redelivery.
 *
 * PayTR retries aggressively, so two deliveries of the same order can overlap.
 * Without a claim both would pass the "already processed?" check and both would
 * grant seats. A claim that is never completed — the process died mid-write —
 * must not block the order forever either, hence the expiry.
 */
const CLAIM_STALE_MS = 5 * 60 * 1000;

type ClaimResult = "claimed" | "duplicate" | "in_flight";

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: string }).code === "P2002"
  );
}

/**
 * Takes exclusive ownership of one merchant_oid.
 *
 * The unique index on `(provider, externalEventId)` is what actually
 * serialises this: two concurrent deliveries both attempt the insert and
 * exactly one succeeds, whatever the database's isolation level.
 */
async function claimCallback(merchantOid: string): Promise<ClaimResult> {
  const key = {
    provider_externalEventId: {
      provider: "PAYTR",
      externalEventId: merchantOid,
    },
  };

  try {
    await prisma.webhookEvent.create({
      data: {
        provider: "PAYTR",
        externalEventId: merchantOid,
        eventType: "paytr.received",
        status: "PROCESSING",
        signatureValid: true,
      },
    });
    return "claimed";
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
  }

  const existing = await prisma.webhookEvent.findUnique({ where: key });
  // Deleted between the insert and this read: nothing owns it, so take it.
  if (!existing) return "claimed";
  if (existing.status === "PROCESSED") return "duplicate";

  const age = Date.now() - existing.createdAt.getTime();
  if (existing.status === "PROCESSING" && age < CLAIM_STALE_MS) {
    return "in_flight";
  }

  // A previous attempt failed, or died holding the claim. Retake it.
  await prisma.webhookEvent.update({
    where: key,
    data: { status: "PROCESSING", errorMessage: null },
  });
  return "claimed";
}

/** Releases a claim so a later delivery can retry, without marking success. */
async function releaseClaim(merchantOid: string, reason: string): Promise<void> {
  await prisma.webhookEvent
    .update({
      where: {
        provider_externalEventId: {
          provider: "PAYTR",
          externalEventId: merchantOid,
        },
      },
      data: { status: "FAILED", errorMessage: reason },
    })
    .catch(() => undefined);
}

export async function processPaytrCallback(
  payload: PaytrCallbackPayload
): Promise<CallbackResult> {
  const merchantOid = payload.merchant_oid;

  const claim = await claimCallback(merchantOid);
  if (claim === "duplicate") {
    return { handled: true, duplicate: true };
  }
  if (claim === "in_flight") {
    return { handled: false, duplicate: true, inFlight: true };
  }

  const invoice = await findInvoiceByMerchantOid(merchantOid);
  if (!invoice) {
    // Not ours (or not yet written). Release the claim first, otherwise the
    // redelivery that arrives once the invoice exists would be turned away as
    // in-flight. Then surface it so the caller can ask PayTR to retry rather
    // than silently acknowledging a payment we cannot match.
    await releaseClaim(merchantOid, `No invoice for merchant_oid ${merchantOid}`);
    throw new Error(`No invoice for merchant_oid ${merchantOid}`);
  }

  const succeeded = payload.status === "success";
  const amount = Number(payload.total_amount);

  try {
    await prisma.paymentTransaction.create({
      data: {
        invoiceId: invoice.id,
        provider: "PAYTR",
        merchantOid,
        amount: Number.isFinite(amount) ? amount : invoice.amount,
        status: succeeded ? "SUCCESS" : "FAILED",
        rawResponse: JSON.stringify(payload),
        failedReasonCode: payload.failed_reason_code ?? null,
        failedReasonMsg: payload.failed_reason_msg ?? null,
        attemptNo: (await prisma.paymentTransaction.count({
          where: { invoiceId: invoice.id },
        })) + 1,
      },
    });

    let seatsApplied = false;

    if (succeeded) {
      const result = await markInvoicePaid(invoice.id);
      seatsApplied = result.seatsApplied;
    } else {
      await markInvoiceFailed(
        invoice.id,
        payload.failed_reason_msg ?? "Payment declined"
      );
    }

    // Store the vaulted card handle if PayTR sent one; every future automatic
    // charge depends on it. `ctoken` stays null until the card list is read,
    // and a compound unique containing a nullable column cannot be upserted,
    // so this checks first rather than relying on the constraint.
    if (succeeded && payload.utoken) {
      const known = await prisma.paymentMethod.findFirst({
        where: {
          tenantId: invoice.tenantId,
          provider: "PAYTR",
          utoken: payload.utoken,
        },
        select: { id: true },
      });

      if (!known) {
        await prisma.paymentMethod.create({
          data: {
            tenantId: invoice.tenantId,
            provider: "PAYTR",
            utoken: payload.utoken,
            isDefault: true,
          },
        });
      }
    }

    await prisma.webhookEvent.upsert({
      where: {
        provider_externalEventId: {
          provider: "PAYTR",
          externalEventId: merchantOid,
        },
      },
      create: {
        provider: "PAYTR",
        externalEventId: merchantOid,
        eventType: succeeded ? "paytr.success" : "paytr.failed",
        status: "PROCESSED",
        signatureValid: true,
        payload: JSON.stringify(payload),
      },
      update: {
        status: "PROCESSED",
        signatureValid: true,
        errorMessage: null,
        payload: JSON.stringify(payload),
      },
    });

    return {
      handled: true,
      duplicate: false,
      invoiceId: invoice.id,
      seatsApplied,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    await prisma.webhookEvent
      .upsert({
        where: {
          provider_externalEventId: {
            provider: "PAYTR",
            externalEventId: merchantOid,
          },
        },
        create: {
          provider: "PAYTR",
          externalEventId: merchantOid,
          eventType: "paytr.error",
          status: "FAILED",
          signatureValid: true,
          payload: JSON.stringify(payload),
          errorMessage: message,
        },
        update: { status: "FAILED", errorMessage: message },
      })
      .catch(() => undefined);

    throw error;
  }
}
