import { describe, expect, it } from "vitest";
import { calculateSeatPurchaseAmount } from "@/lib/payment/payment-service";

describe("payment-service", () => {
  it("calculates seat package totals", () => {
    expect(calculateSeatPurchaseAmount(50)).toBe(50 * 29);
    expect(calculateSeatPurchaseAmount(100)).toBe(100 * 25);
    expect(calculateSeatPurchaseAmount(250)).toBe(250 * 22);
  });

  it("rejects unsupported packages", () => {
    expect(() => calculateSeatPurchaseAmount(75)).toThrow("Unsupported seat package");
  });
});
