import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  createSeatPurchaseCheckout,
  calculateSeatPurchaseAmount,
} from "@/lib/payment/payment-service";
import {
  registerPaymentProvider,
  resetPaymentProvidersForTests,
} from "@/lib/payment/provider-registry";
import { handlePaymentCompleted } from "@/lib/payment/webhook-processor";

const hasTestDb = Boolean(process.env.TEST_DATABASE_URL);

describe.skipIf(!hasTestDb)("checkout flow integration", () => {
  it("creates checkout and upgrades seats on payment completion", async () => {
    resetPaymentProvidersForTests();
    registerPaymentProvider("STRIPE", {
      name: "STRIPE",
      createCheckout: async () => ({
        checkoutUrl: "https://checkout.test/session",
        providerRef: `cs_test_${Date.now()}`,
      }),
      verifyWebhook: async () => ({
        eventId: "evt_test",
        eventType: "checkout.session.completed",
        payload: {
          eventType: "payment.completed",
          providerRef: "cs_test",
          raw: {},
        },
      }),
    });

    const tenant = await prisma.tenant.create({
      data: {
        name: "Checkout Tenant",
        status: "ACTIVE",
        seatLimit: 50,
        seatsUsed: 5,
        planType: "50",
      },
    });

    const checkout = await createSeatPurchaseCheckout({
      tenantId: tenant.id,
      seatCount: 50,
      provider: "STRIPE",
      customerEmail: "billing@test.com",
      successUrl: "http://localhost:3000/tenant/billing",
      cancelUrl: "http://localhost:3000/tenant/billing",
    });

    expect(checkout.amount).toBe(calculateSeatPurchaseAmount(50));
    expect(checkout.paymentType).toBe("UPGRADE");

    await handlePaymentCompleted(checkout.paymentId, tenant.id, 50, "UPGRADE");

    const updated = await prisma.tenant.findUnique({ where: { id: tenant.id } });
    const payment = await prisma.payment.findUnique({ where: { id: checkout.paymentId } });

    expect(updated?.seatLimit).toBe(100);
    expect(payment?.status).toBe("COMPLETED");

    await prisma.payment.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.auditLog.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.tenant.delete({ where: { id: tenant.id } });
    resetPaymentProvidersForTests();
  });
});
