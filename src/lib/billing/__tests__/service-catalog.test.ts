import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    service: { findUnique: vi.fn(), delete: vi.fn() },
  },
}));

import { prisma } from "@/lib/prisma";
import { CatalogError, deleteService, validateTiers } from "@/lib/billing/service-catalog";
import { serviceSchema } from "@/lib/billing/validators";

const tier = (min: number, max: number | null, price = 1000) => ({
  minParticipants: min,
  maxParticipants: max,
  pricePerParticipant: price,
  currency: "TRY" as const,
});

function expectCatalogError(fn: () => unknown, code: string) {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(CatalogError);
    expect((error as CatalogError).code).toBe(code);
    return;
  }
  throw new Error(`Expected CatalogError ${code}`);
}

describe("validateTiers", () => {
  it("accepts adjacent tiers (50 / 51) and an unlimited last tier, sorted", () => {
    const sorted = validateTiers([tier(101, null), tier(1, 50), tier(51, 100)]);
    expect(sorted.map((t) => t.minParticipants)).toEqual([1, 51, 101]);
  });

  it("accepts gaps between tiers", () => {
    expect(() => validateTiers([tier(1, 50), tier(100, null)])).not.toThrow();
  });

  it("rejects tiers sharing a boundary (1–50 and 50–100)", () => {
    expectCatalogError(() => validateTiers([tier(1, 50), tier(50, 100)]), "TIER_OVERLAP");
  });

  it("rejects an unlimited tier followed by another tier", () => {
    expectCatalogError(() => validateTiers([tier(1, null), tier(51, 100)]), "TIER_OVERLAP");
  });

  it("rejects duplicated tiers", () => {
    expectCatalogError(() => validateTiers([tier(1, 50), tier(1, 50)]), "TIER_OVERLAP");
  });

  it("rejects a tier whose max is below its min", () => {
    expectCatalogError(() => validateTiers([tier(60, 50)]), "TIER_RANGE");
  });
});

describe("serviceSchema", () => {
  it("normalises the code and rejects fractional kuruş", () => {
    expect(serviceSchema.parse({ code: "ai_tools", name: "AI", tiers: [tier(1, null)] }).code).toBe("AI_TOOLS");
    expect(
      serviceSchema.safeParse({ code: "X1", name: "X1", tiers: [tier(1, null, 10.5)] }).success
    ).toBe(false);
    expect(serviceSchema.safeParse({ code: "BAD CODE", name: "Bad", tiers: [tier(1, null)] }).success).toBe(false);
    expect(serviceSchema.safeParse({ code: "EMPTY", name: "Empty", tiers: [] }).success).toBe(false);
  });
});

describe("deleteService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("refuses to delete a service that has orders", async () => {
    vi.mocked(prisma.service.findUnique).mockResolvedValue({
      _count: { orderItems: 2, tenantServices: 0 },
    } as never);

    await expect(deleteService("svc_1")).rejects.toMatchObject({ code: "SERVICE_IN_USE", statusCode: 409 });
    expect(prisma.service.delete).not.toHaveBeenCalled();
  });

  it("deletes an unused service", async () => {
    vi.mocked(prisma.service.findUnique).mockResolvedValue({
      _count: { orderItems: 0, tenantServices: 0 },
    } as never);

    await deleteService("svc_1");
    expect(prisma.service.delete).toHaveBeenCalledWith({ where: { id: "svc_1" } });
  });
});
