import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => {
  const tx = {
    service: { findMany: vi.fn() },
    order: { create: vi.fn() },
    user: { findFirst: vi.fn() },
  };
  return {
    prisma: {
      $transaction: vi.fn((fn: (client: typeof tx) => unknown) => fn(tx)),
      order: { update: vi.fn() },
      __tx: tx,
    },
  };
});

vi.mock("@/lib/billing/checkout-service", () => ({
  requestPaytrCheckoutUrl: vi.fn(),
}));

import { prisma } from "@/lib/prisma";
import { requestPaytrCheckoutUrl } from "@/lib/billing/checkout-service";
import { createOrder, EmailTakenError, startOrderCheckout } from "@/lib/billing/order-service";
import { createOrderSchema } from "@/lib/billing/validators";

type Mock = ReturnType<typeof vi.fn>;
const tx = (prisma as unknown as { __tx: Record<string, Record<string, Mock>> }).__tx;

const hackathon = {
  id: "svc_hack",
  code: "HACKATHON",
  name: "Hackathon",
  tiers: [
    { minParticipants: 1, maxParticipants: 50, pricePerParticipant: 1000, currency: "TRY" },
    { minParticipants: 51, maxParticipants: null, pricePerParticipant: 800, currency: "TRY" },
  ],
};

describe("createOrder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tx.service.findMany.mockResolvedValue([hackathon]);
    tx.user.findFirst.mockResolvedValue(null);
    tx.order.create.mockImplementation(({ data }) => Promise.resolve({ id: "ord_1", ...data }));
  });

  it("prices on the server and ignores any client-sent price", async () => {
    const input = createOrderSchema.parse({
      institutionName: "Test University",
      contactName: "Ayla Test",
      contactEmail: "Admin@Uni.Test",
      locale: "az",
      // Extra client fields are stripped by the schema and never reach pricing.
      total: 1,
      items: [{ serviceCode: "HACKATHON", participantCount: 60, unitPrice: 1 }],
    });

    await createOrder(input);

    const { data } = tx.order.create.mock.calls[0][0];
    expect(data.total).toBe(48_000);
    expect(data.contactEmail).toBe("admin@uni.test");
    expect(data.paytrMerchantOid).toMatch(/^ORD[A-Za-z0-9]+$/);
    expect(data.items.create).toEqual([
      { serviceId: "svc_hack", participantCount: 60, unitPrice: 800, subtotal: 48_000 },
    ]);
  });
});

describe("createOrder — email", () => {
  it("rejects an email that already has an account, before creating the order", async () => {
    vi.clearAllMocks();
    tx.user.findFirst.mockResolvedValue({ id: "usr_1" });
    const input = createOrderSchema.parse({
      institutionName: "Test University",
      contactName: "Ayla Test",
      contactEmail: "taken@uni.test",
      items: [{ serviceCode: "HACKATHON", participantCount: 10 }],
    });

    await expect(createOrder(input)).rejects.toBeInstanceOf(EmailTakenError);
    expect(tx.order.create).not.toHaveBeenCalled();
  });
});

describe("startOrderCheckout", () => {
  const order = {
    id: "ord_1",
    institutionName: "Test University",
    contactName: "Ayla Test",
    contactEmail: "admin@uni.test",
    locale: "az",
    status: "PENDING",
    total: 48_000,
    currency: "TRY",
    paytrMerchantOid: "ORDabc123",
    tenantId: null,
    createdAt: new Date(),
    paidAt: null,
  };

  beforeEach(() => vi.clearAllMocks());

  it("returns the PayTR URL with locale-aware return URLs", async () => {
    vi.mocked(requestPaytrCheckoutUrl).mockResolvedValue("https://paytr.test/abc");

    const url = await startOrderCheckout(order, "1.2.3.4", "https://app.test");

    expect(url).toBe("https://paytr.test/abc");
    expect(requestPaytrCheckoutUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        merchantOid: "ORDabc123",
        amount: 48_000,
        okUrl: "https://app.test/az/pricing?payment=success",
        failUrl: "https://app.test/az/pricing?payment=failed",
      })
    );
  });

  it("marks the order FAILED when PayTR refuses the token", async () => {
    vi.mocked(requestPaytrCheckoutUrl).mockRejectedValue(new Error("PayTR down"));
    vi.mocked(prisma.order.update).mockResolvedValue({} as never);

    await expect(startOrderCheckout(order, "1.2.3.4")).rejects.toThrow("PayTR down");
    expect(prisma.order.update).toHaveBeenCalledWith({
      where: { id: "ord_1" },
      data: { status: "FAILED" },
    });
  });
});
