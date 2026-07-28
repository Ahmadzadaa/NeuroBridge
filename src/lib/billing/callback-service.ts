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
  invoiceId?: string;
  seatsApplied?: boolean;
}

export async function processPaytrCallback(
  payload: PaytrCallbackPayload
): Promise<CallbackResult> {
  const merchantOid = payload.merchant_oid;

  const existing = await prisma.webhookEvent.findUnique({
    where: {
      provider_externalEventId: {
        provider: "PAYTR",
        externalEventId: merchantOid,
      },
    },
  });

  if (existing?.status === "PROCESSED") {
    return { handled: true, duplicate: true };
  }

  const invoice = await findInvoiceByMerchantOid(merchantOid);
  if (!invoice) {
    // Not ours (or not yet written). Surface it so the caller can ask PayTR to
    // retry rather than silently acknowledging a payment we cannot match.
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
