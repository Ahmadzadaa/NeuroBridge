import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: { service: { findMany: vi.fn() } },
}));

import { prisma } from "@/lib/prisma";
import { calculateQuote, PricingError } from "@/lib/pricing";

const tier = (min: number, max: number | null, price: number, currency = "TRY") => ({
  minParticipants: min,
  maxParticipants: max,
  pricePerParticipant: price,
  currency,
});

const catalogue = [
  {
    id: "svc_hack",
    code: "HACKATHON",
    name: "Hackathon",
    tiers: [tier(1, 50, 1000), tier(51, 100, 800), tier(101, null, 600), tier(1, 100, 30, "USD"), tier(101, null, 20, "USD")],
  },
  {
    id: "svc_teach",
    code: "TEACHERS",
    name: "Teacher-Student Panel",
    tiers: [tier(1, 50, 1500), tier(51, 100, 1200)],
  },
];

async function expectPricingError(promise: Promise<unknown>, code: string) {
  await expect(promise).rejects.toBeInstanceOf(PricingError);
  await expect(promise).rejects.toMatchObject({ code });
}

describe("calculateQuote", () => {
  beforeEach(() => {
    vi.mocked(prisma.service.findMany).mockResolvedValue(catalogue as never);
  });

  it("uses the lower tier at its upper boundary (50)", async () => {
    const q = await calculateQuote([{ serviceCode: "HACKATHON", participantCount: 50 }]);
    expect(q.items[0]).toMatchObject({ unitPrice: 1000, subtotal: 50_000 });
    expect(q.total).toBe(50_000);
  });

  it("switches to the next tier at 51", async () => {
    const q = await calculateQuote([{ serviceCode: "HACKATHON", participantCount: 51 }]);
    expect(q.items[0]).toMatchObject({ unitPrice: 800, subtotal: 40_800 });
  });

  it("sums several services into one total", async () => {
    const q = await calculateQuote([
      { serviceCode: "HACKATHON", participantCount: 60 },
      { serviceCode: "TEACHERS", participantCount: 60 },
    ]);
    expect(q.items.map((i) => i.subtotal)).toEqual([48_000, 72_000]);
    expect(q.total).toBe(120_000);
    expect(q.currency).toBe("TRY");
  });

  it("prices counts above every bound on the unlimited tier", async () => {
    const q = await calculateQuote([{ serviceCode: "HACKATHON", participantCount: 5000 }]);
    expect(q.items[0].unitPrice).toBe(600);
    expect(q.total).toBe(3_000_000);
  });

  it("rejects an unknown or inactive service", async () => {
    await expectPricingError(
      calculateQuote([{ serviceCode: "NOPE", participantCount: 10 }]),
      "UNKNOWN_SERVICE",
    );
  });

  it("rejects a count no tier covers", async () => {
    await expectPricingError(
      calculateQuote([{ serviceCode: "TEACHERS", participantCount: 101 }]),
      "NO_MATCHING_TIER",
    );
  });

  it.each([0, -5, 2.5])("rejects participant count %s", async (count) => {
    await expectPricingError(
      calculateQuote([{ serviceCode: "HACKATHON", participantCount: count }]),
      "INVALID_PARTICIPANT_COUNT",
    );
  });

  it("rejects an empty selection and duplicate services", async () => {
    await expectPricingError(calculateQuote([]), "EMPTY_QUOTE");
    await expectPricingError(
      calculateQuote([
        { serviceCode: "HACKATHON", participantCount: 10 },
        { serviceCode: "HACKATHON", participantCount: 20 },
      ]),
      "DUPLICATE_SERVICE",
    );
  });

  it("prices in the requested currency, from that currency's tiers only", async () => {
    const usd = await calculateQuote([{ serviceCode: "HACKATHON", participantCount: 60 }], "USD");
    expect(usd).toMatchObject({ currency: "USD", total: 60 * 30 });
    const lira = await calculateQuote([{ serviceCode: "HACKATHON", participantCount: 60 }]);
    expect(lira).toMatchObject({ currency: "TRY", total: 60 * 800 });
    // TEACHERS has no dollar prices, so it cannot be bought in USD.
    await expectPricingError(
      calculateQuote([{ serviceCode: "TEACHERS", participantCount: 10 }], "USD"),
      "NO_MATCHING_TIER",
    );
  });

  it("only queries active services", async () => {
    await calculateQuote([{ serviceCode: "HACKATHON", participantCount: 10 }]);
    expect(prisma.service.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ active: true }) }),
    );
  });
});
