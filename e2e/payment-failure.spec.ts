import { test, expect } from "@playwright/test";
import { prisma } from "./helpers/db";
import { handlePaymentFailed } from "../src/lib/payment/webhook-processor";

test.describe("Payment failure", () => {
  test("marks payment failed without changing seat limit", async () => {
    const tenant = await prisma.tenant.create({
      data: {
        name: "E2E Payment Failure",
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
        provider: "STRIPE",
        providerRef: `e2e_fail_${Date.now()}`,
        paymentType: "UPGRADE",
        idempotencyKey: `idem_fail_${Date.now()}`,
        status: "PENDING",
      },
    });

    await handlePaymentFailed(payment.id, tenant.id);

    const updated = await prisma.tenant.findUnique({ where: { id: tenant.id } });
    const updatedPayment = await prisma.payment.findUnique({ where: { id: payment.id } });

    expect(updated?.seatLimit).toBe(50);
    expect(updatedPayment?.status).toBe("FAILED");
    expect(updatedPayment?.retryCount).toBe(1);

    await prisma.payment.delete({ where: { id: payment.id } });
    await prisma.auditLog.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.tenant.delete({ where: { id: tenant.id } });
  });
});
