import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSeatPurchaseCheckout } from "@/lib/payment/payment-service";
import {
  registerPaymentProvider,
  resetPaymentProvidersForTests,
} from "@/lib/payment/provider-registry";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    tenant: { findUnique: vi.fn() },
    payment: {
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";

describe("createSeatPurchaseCheckout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetPaymentProvidersForTests();
    registerPaymentProvider("STRIPE", {
      name: "STRIPE",
      createCheckout: vi.fn().mockResolvedValue({
        checkoutUrl: "https://checkout.test",
        providerRef: "cs_test",
      }),
      verifyWebhook: vi.fn(),
    });
  });

  it("creates pending payment and checkout session", async () => {
    vi.mocked(prisma.tenant.findUnique).mockResolvedValue({
      id: "t1",
      status: "ACTIVE",
      seatLimit: 50,
    } as never);
    vi.mocked(prisma.payment.create).mockResolvedValue({
      id: "pay1",
    } as never);
    vi.mocked(prisma.payment.update).mockResolvedValue({} as never);

    const result = await createSeatPurchaseCheckout({
      tenantId: "t1",
      seatCount: 50,
      provider: "STRIPE",
      customerEmail: "admin@test.com",
      successUrl: "http://localhost/success",
      cancelUrl: "http://localhost/cancel",
    });

    expect(result.paymentId).toBe("pay1");
    expect(result.checkoutUrl).toContain("checkout");
    expect(result.paymentType).toBe("UPGRADE");
  });
});
