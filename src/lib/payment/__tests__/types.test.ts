import { describe, expect, it } from "vitest";
import {
  PaymentConfigurationError,
  PaymentVerificationError,
} from "@/lib/payment/types";

describe("payment types", () => {
  it("creates configuration errors with 503 status", () => {
    const error = new PaymentConfigurationError("Stripe not configured");
    expect(error.statusCode).toBe(503);
    expect(error.name).toBe("PaymentConfigurationError");
  });

  it("creates verification errors with 400 status", () => {
    const error = new PaymentVerificationError("Invalid signature");
    expect(error.statusCode).toBe(400);
  });
});
