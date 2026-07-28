import { recordAudit } from "@/lib/audit/audit-service";
import { AUDIT_ACTIONS } from "@/lib/audit/actions";
import { prisma } from "@/lib/prisma";
import type { PaymentProvider } from "@/lib/types";
import type { NormalizedWebhookPayload } from "@/lib/payment/types";
import {
  addSeatsFromPayment,
  removeSeatsFromRefund,
} from "@/lib/seats/seat-service";

export interface WebhookProcessResult {
  duplicate: boolean;
  processed: boolean;
  paymentId?: string;
}

async function findPayment(payload: NormalizedWebhookPayload) {
  if (payload.paymentId) {
    const byId = await prisma.payment.findUnique({ where: { id: payload.paymentId } });
    if (byId) return byId;
  }

  if (payload.providerRef) {
    return prisma.payment.findFirst({
      where: { providerRef: payload.providerRef },
    });
  }

  return null;
}

async function handlePaymentCompleted(
  paymentId: string,
  tenantId: string,
  seatCount: number,
  paymentType: string
) {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { id: paymentId } });
    if (!payment) {
      throw new Error(`Payment not found: ${paymentId}`);
    }

    if (payment.status === "COMPLETED") {
      return { alreadyCompleted: true, payment };
    }

    const seatUpgrade = await addSeatsFromPayment(tx, tenantId, seatCount, {
      activateTenant: paymentType === "INITIAL",
    });

    const updated = await tx.payment.update({
      where: { id: paymentId },
      data: { status: "COMPLETED" },
    });

    await recordAudit({
      tx,
      action: AUDIT_ACTIONS.SEAT_UPGRADE_COMPLETED,
      tenantId,
      details: {
        paymentId,
        seatCount,
        previousLimit: seatUpgrade.previousLimit,
        newLimit: seatUpgrade.newLimit,
        paymentType,
      },
    });

    await recordAudit({
      tx,
      action: AUDIT_ACTIONS.PAYMENT_COMPLETED,
      tenantId,
      details: { paymentId, seatCount, amount: payment.amount },
    });

    return { alreadyCompleted: false, payment: updated };
  });
}

async function handlePaymentFailed(paymentId: string, tenantId: string) {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { id: paymentId } });
    if (!payment || payment.status === "COMPLETED" || payment.status === "REFUNDED") {
      return payment;
    }

    const updated = await tx.payment.update({
      where: { id: paymentId },
      data: {
        status: "FAILED",
        retryCount: { increment: 1 },
      },
    });

    await recordAudit({
      tx,
      action: AUDIT_ACTIONS.PAYMENT_FAILED,
      tenantId,
      details: { paymentId },
    });

    return updated;
  });
}

async function handlePaymentRefunded(
  paymentId: string,
  tenantId: string,
  seatCount: number,
  refundAmount: number
) {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { id: paymentId } });
    if (!payment) {
      throw new Error(`Payment not found: ${paymentId}`);
    }

    if (payment.status === "REFUNDED") {
      return { alreadyRefunded: true, payment };
    }

    const seatDowngrade = await removeSeatsFromRefund(tx, tenantId, seatCount);

    const updated = await tx.payment.update({
      where: { id: paymentId },
      data: {
        status: "REFUNDED",
        refundedAmount: refundAmount,
      },
    });

    await recordAudit({
      tx,
      action: AUDIT_ACTIONS.PAYMENT_REFUNDED,
      tenantId,
      details: {
        paymentId,
        seatCount,
        refundAmount,
        previousLimit: seatDowngrade.previousLimit,
        newLimit: seatDowngrade.newLimit,
      },
    });

    return { alreadyRefunded: false, payment: updated };
  });
}

export async function processWebhookEvent(
  provider: PaymentProvider,
  eventId: string,
  eventType: string,
  payload: NormalizedWebhookPayload
): Promise<WebhookProcessResult> {
  const existing = await prisma.webhookEvent.findUnique({
    where: {
      provider_externalEventId: {
        provider,
        externalEventId: eventId,
      },
    },
  });

  if (existing?.status === "PROCESSED") {
    return { duplicate: true, processed: true, paymentId: payload.paymentId };
  }

  const payment = await findPayment(payload);
  if (!payment) {
    throw new Error("Payment record not found for webhook event");
  }

  const tenantId = payload.tenantId ?? payment.tenantId;
  const seatCount = payload.seatCount ?? payment.seatCount;

  try {
    if (payload.eventType === "payment.completed") {
      await handlePaymentCompleted(
        payment.id,
        tenantId,
        seatCount,
        payment.paymentType
      );
    } else if (payload.eventType === "payment.failed") {
      await handlePaymentFailed(payment.id, tenantId);
    } else if (payload.eventType === "payment.refunded") {
      const refundAmount = payload.refundAmount ?? payment.amount;
      await handlePaymentRefunded(payment.id, tenantId, seatCount, refundAmount);
    }

    await prisma.webhookEvent.upsert({
      where: {
        provider_externalEventId: {
          provider,
          externalEventId: eventId,
        },
      },
      create: {
        provider,
        externalEventId: eventId,
        eventType,
        status: "PROCESSED",
        signatureValid: true,
        payload: JSON.stringify(payload),
      },
      update: {
        status: "PROCESSED",
        errorMessage: null,
        payload: JSON.stringify(payload),
      },
    });

    return { duplicate: false, processed: true, paymentId: payment.id };
  } catch (error) {
    await prisma.webhookEvent.upsert({
      where: {
        provider_externalEventId: {
          provider,
          externalEventId: eventId,
        },
      },
      create: {
        provider,
        externalEventId: eventId,
        eventType,
        status: "FAILED",
        payload: JSON.stringify(payload),
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      },
      update: {
        status: "FAILED",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      },
    });

    await prisma.payment.update({
      where: { id: payment.id },
      data: { retryCount: { increment: 1 } },
    });

    throw error;
  }
}

export {
  handlePaymentCompleted,
  handlePaymentFailed,
  handlePaymentRefunded,
};
