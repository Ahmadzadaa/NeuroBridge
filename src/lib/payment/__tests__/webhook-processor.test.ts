import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  handlePaymentCompleted,
  handlePaymentFailed,
  handlePaymentRefunded,
  processWebhookEvent,
} from "@/lib/payment/webhook-processor";
import type { NormalizedWebhookPayload } from "@/lib/payment/types";

const hasTestDb = Boolean(process.env.TEST_DATABASE_URL);

describe.skipIf(!hasTestDb)("webhook processor integration", () => {
  it("adds seats on completed payment (50 + 50 = 100)", async () => {
    const tenant = await prisma.tenant.create({
      data: {
        name: "Webhook Test Tenant",
        status: "ACTIVE",
        seatLimit: 50,
        seatsUsed: 10,
        planType: "50",
      },
    });

    const payment = await prisma.payment.create({
      data: {
        tenantId: tenant.id,
        amount: 1450,
        currency: "TRY",
        seatCount: 50,
        provider: "PAYTR",
        providerRef: `cs_test_${Date.now()}`,
        paymentType: "UPGRADE",
        idempotencyKey: `idem_${Date.now()}`,
        status: "PENDING",
      },
    });

    await handlePaymentCompleted(payment.id, tenant.id, 50, "UPGRADE");

    const updatedTenant = await prisma.tenant.findUnique({ where: { id: tenant.id } });
    const updatedPayment = await prisma.payment.findUnique({ where: { id: payment.id } });

    expect(updatedTenant?.seatLimit).toBe(100);
    expect(updatedPayment?.status).toBe("COMPLETED");

    await prisma.payment.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.auditLog.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.tenant.delete({ where: { id: tenant.id } });
  });

  it("marks failed payments without changing seat limits", async () => {
    const tenant = await prisma.tenant.create({
      data: {
        name: "Failed Payment Tenant",
        status: "ACTIVE",
        seatLimit: 50,
        seatsUsed: 5,
      },
    });

    const payment = await prisma.payment.create({
      data: {
        tenantId: tenant.id,
        amount: 1450,
        currency: "TRY",
        seatCount: 50,
        provider: "PAYTR",
        providerRef: `cs_fail_${Date.now()}`,
        paymentType: "UPGRADE",
        idempotencyKey: `idem_fail_${Date.now()}`,
        status: "PENDING",
      },
    });

    await handlePaymentFailed(payment.id, tenant.id);

    const updatedTenant = await prisma.tenant.findUnique({ where: { id: tenant.id } });
    const updatedPayment = await prisma.payment.findUnique({ where: { id: payment.id } });

    expect(updatedTenant?.seatLimit).toBe(50);
    expect(updatedPayment?.status).toBe("FAILED");
    expect(updatedPayment?.retryCount).toBe(1);

    await prisma.payment.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.auditLog.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.tenant.delete({ where: { id: tenant.id } });
  });

  it("processes webhook idempotently", async () => {
    const tenant = await prisma.tenant.create({
      data: {
        name: "Idempotency Tenant",
        status: "ACTIVE",
        seatLimit: 50,
        seatsUsed: 0,
      },
    });

    const payment = await prisma.payment.create({
      data: {
        tenantId: tenant.id,
        amount: 1450,
        currency: "TRY",
        seatCount: 50,
        provider: "PAYTR",
        providerRef: `cs_idem_${Date.now()}`,
        paymentType: "UPGRADE",
        idempotencyKey: `idem_idem_${Date.now()}`,
        status: "PENDING",
      },
    });

    const payload: NormalizedWebhookPayload = {
      eventType: "payment.completed",
      providerRef: payment.providerRef!,
      paymentId: payment.id,
      tenantId: tenant.id,
      seatCount: 50,
      amount: 1450,
      currency: "TRY",
      raw: {},
    };

    const eventId = `evt_${Date.now()}`;
    const first = await processWebhookEvent("PAYTR", eventId, "checkout.session.completed", payload);
    const second = await processWebhookEvent("PAYTR", eventId, "checkout.session.completed", payload);

    const updatedTenant = await prisma.tenant.findUnique({ where: { id: tenant.id } });

    expect(first.duplicate).toBe(false);
    expect(second.duplicate).toBe(true);
    expect(updatedTenant?.seatLimit).toBe(100);

    await prisma.webhookEvent.deleteMany({ where: { provider: "PAYTR" } });
    await prisma.payment.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.auditLog.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.tenant.delete({ where: { id: tenant.id } });
  });

  it("reduces seat limit on refund without going below seats used", async () => {
    const tenant = await prisma.tenant.create({
      data: {
        name: "Refund Tenant",
        status: "ACTIVE",
        seatLimit: 100,
        seatsUsed: 80,
      },
    });

    const payment = await prisma.payment.create({
      data: {
        tenantId: tenant.id,
        amount: 1450,
        currency: "TRY",
        seatCount: 50,
        provider: "PAYTR",
        providerRef: `cs_refund_${Date.now()}`,
        paymentType: "UPGRADE",
        idempotencyKey: `idem_refund_${Date.now()}`,
        status: "COMPLETED",
      },
    });

    await handlePaymentRefunded(payment.id, tenant.id, 50, 1450);

    const updatedTenant = await prisma.tenant.findUnique({ where: { id: tenant.id } });
    const updatedPayment = await prisma.payment.findUnique({ where: { id: payment.id } });

    expect(updatedTenant?.seatLimit).toBe(80);
    expect(updatedPayment?.status).toBe("REFUNDED");
    expect(updatedPayment?.refundedAmount).toBe(1450);

    await prisma.payment.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.auditLog.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.tenant.delete({ where: { id: tenant.id } });
  });
});

describe("webhook processor exports", () => {
  it("exports payment lifecycle handlers", async () => {
    const module = await import("@/lib/payment/webhook-processor");
    expect(module.handlePaymentCompleted).toBeTypeOf("function");
    expect(module.handlePaymentFailed).toBeTypeOf("function");
    expect(module.handlePaymentRefunded).toBeTypeOf("function");
    expect(module.processWebhookEvent).toBeTypeOf("function");
  });
});
