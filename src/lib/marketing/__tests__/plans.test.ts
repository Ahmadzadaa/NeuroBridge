import { describe, expect, it } from "vitest";
import { formatPlanPrice, planFeatureKey } from "@/lib/marketing/plans";

describe("planFeatureKey", () => {
  // Marketing copy is keyed by this slug, so a plan renamed in billing must
  // still land on a predictable key rather than a random one.
  it.each([
    ["Standard", "standard"],
    ["Pro Plus", "pro_plus"],
    ["Enterprise (EU)", "enterprise_eu"],
    ["  Growth  ", "growth"],
  ])("slugifies %s", (name, expected) => {
    expect(planFeatureKey(name)).toBe(expected);
  });

  it("never produces an empty key", () => {
    expect(planFeatureKey("—")).toBe("plan");
    expect(planFeatureKey("")).toBe("plan");
  });
});

describe("formatPlanPrice", () => {
  const plan = { pricePerSeatMonthly: 2500, currency: "TRY" };

  it("renders integer minor units as currency", () => {
    // Non-breaking spaces vary by ICU build, so assert on the digits.
    expect(formatPlanPrice(plan, "az")).toContain("25");
    expect(formatPlanPrice(plan, "tr")).toContain("25");
  });

  // A round seat price reads better without ",00" on a pricing card.
  it("drops the decimals for a whole-unit price", () => {
    expect(formatPlanPrice(plan, "en")).not.toContain("25.00");
  });

  it("keeps the decimals when the price is not whole", () => {
    expect(formatPlanPrice({ pricePerSeatMonthly: 2550, currency: "TRY" }, "en")).toContain(
      "25.50",
    );
  });

  it("falls back to a known locale tag for an unexpected locale", () => {
    expect(() => formatPlanPrice(plan, "de")).not.toThrow();
  });
});
