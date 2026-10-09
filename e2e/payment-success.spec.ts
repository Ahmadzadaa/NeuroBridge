import { test, expect } from "@playwright/test";
import { prisma } from "./helpers/db";
import { handlePaymentCompleted } from "../src/lib/payment/webhook-processor";

test.describe("Payment success", () => {
  test("upgrades tenant seats after webhook completion", async () => {
    const tenant = await prisma.tenant.create({
      data: {
        name: "E2E Payment Success",
        status: "ACTIVE",
        seatLimit: 50,
        seatsUsed: 0,
        planType: "50",
      },
    });

    const payment = await prisma.payment.create({
      data: {
        tenantId: tenant.id,
        amount: 1450,
        currency: "TRY",
        seatCount: 50,
        provider: "STRIPE",
        providerRef: `e2e_success_${Date.now()}`,
        paymentType: "UPGRADE",
        idempotencyKey: `idem_success_${Date.now()}`,
        status: "PENDING",
      },
    });

    await handlePaymentCompleted(payment.id, tenant.id, 50, "UPGRADE");

    const updated = await prisma.tenant.findUnique({ where: { id: tenant.id } });
    const updatedPayment = await prisma.payment.findUnique({ where: { id: payment.id } });

    expect(updated?.seatLimit).toBe(100);
    expect(updatedPayment?.status).toBe("COMPLETED");

    await prisma.payment.delete({ where: { id: payment.id } });
    await prisma.auditLog.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.tenant.delete({ where: { id: tenant.id } });
  });
});
