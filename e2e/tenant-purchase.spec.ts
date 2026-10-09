import { test, expect } from "@playwright/test";
import { prisma } from "./helpers/db";
import {
  registerPaymentProvider,
  resetPaymentProvidersForTests,
} from "../src/lib/payment/provider-registry";
import { createSeatPurchaseCheckout } from "../src/lib/payment/payment-service";
import { handlePaymentCompleted } from "../src/lib/payment/webhook-processor";

test.describe("Tenant purchase", () => {
  test("checkout and webhook upgrade tenant seats", async () => {
    resetPaymentProvidersForTests();
    registerPaymentProvider("PAYTR", {
      name: "PAYTR",
      createCheckout: async () => ({
        checkoutUrl: "https://checkout.e2e.test/session",
        providerRef: `e2e_purchase_${Date.now()}`,
      }),
      verifyWebhook: async () => ({
        eventId: "evt_e2e",
        eventType: "checkout.session.completed",
        payload: {
          eventType: "payment.completed",
          providerRef: "cs_e2e",
          raw: {},
        },
      }),
    });

    const tenant = await prisma.tenant.create({
      data: {
        name: "E2E Purchase Tenant",
        status: "ACTIVE",
        seatLimit: 50,
        seatsUsed: 10,
        planType: "50",
      },
    });

    const checkout = await createSeatPurchaseCheckout({
      tenantId: tenant.id,
      seatCount: 50,
      provider: "PAYTR",
      customerEmail: "purchase@e2e.test",
      successUrl: "http://localhost:3000/tenant/billing",
      cancelUrl: "http://localhost:3000/tenant/billing",
    });

    expect(checkout.checkoutUrl).toContain("checkout");

    await handlePaymentCompleted(checkout.paymentId, tenant.id, 50, "UPGRADE");

    const updated = await prisma.tenant.findUnique({ where: { id: tenant.id } });
    expect(updated?.seatLimit).toBe(100);

    await prisma.payment.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.auditLog.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.tenant.delete({ where: { id: tenant.id } });
    resetPaymentProvidersForTests();
  });
});
