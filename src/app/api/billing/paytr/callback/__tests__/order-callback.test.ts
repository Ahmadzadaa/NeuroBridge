import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: { webhookEvent: { create: vi.fn().mockResolvedValue({}) } },
}));
vi.mock("@/lib/onboarding/order-provisioning", () => ({
  processOrderCallback: vi.fn(),
}));
vi.mock("@/lib/billing/callback-service", () => ({
  processPaytrCallback: vi.fn(),
}));

import { POST } from "@/app/api/billing/paytr/callback/route";
import { processOrderCallback } from "@/lib/onboarding/order-provisioning";
import { processPaytrCallback } from "@/lib/billing/callback-service";
import { resetPaymentProvidersForTests } from "@/lib/payment/provider-registry";
import { buildCallbackHash } from "@/lib/payment/paytr/paytr.hash";
import type { PaytrCredentials } from "@/lib/payment/paytr/paytr.types";

const CREDENTIALS: PaytrCredentials = {
  merchantId: "123456",
  merchantKey: "test-merchant-key",
  merchantSalt: "test-merchant-salt",
  testMode: 1,
  mode: "sandbox",
};

function callback(fields: Record<string, string>): Request {
  return new Request("https://example.com/api/billing/paytr/callback", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(fields),
  });
}

function signed(merchantOid: string, status = "success", totalAmount = "48000") {
  return {
    merchant_oid: merchantOid,
    status,
    total_amount: totalAmount,
    hash: buildCallbackHash(CREDENTIALS, { merchantOid, status, totalAmount }),
  };
}

describe("PayTR callback — self-serve orders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetPaymentProvidersForTests();
    vi.stubEnv("PAYTR_MERCHANT_ID", CREDENTIALS.merchantId);
    vi.stubEnv("PAYTR_MERCHANT_KEY", CREDENTIALS.merchantKey);
    vi.stubEnv("PAYTR_MERCHANT_SALT", CREDENTIALS.merchantSalt);
    vi.stubEnv("PAYTR_TEST_MODE", "1");
  });

  afterEach(() => vi.unstubAllEnvs());

  it("routes a validly signed ORD notification to order provisioning and answers OK", async () => {
    vi.mocked(processOrderCallback).mockResolvedValue({
      outcome: "PROVISIONED",
      orderId: "ord_1",
      tenantId: "ten_1",
      emailSent: true,
    });

    const res = await POST(callback(signed("ORDabc123")));

    expect(res.status).toBe(200);
    expect(await res.text()).toBe("OK");
    expect(processOrderCallback).toHaveBeenCalledWith(
      expect.objectContaining({ merchant_oid: "ORDabc123", status: "success" })
    );
    expect(processPaytrCallback).not.toHaveBeenCalled();
  });

  it("rejects an invalid hash without touching the order", async () => {
    const res = await POST(callback({ ...signed("ORDabc123"), hash: "forged" }));

    expect(res.status).toBe(400);
    expect(processOrderCallback).not.toHaveBeenCalled();
  });

  it("rejects a hash signed for a different amount", async () => {
    const res = await POST(callback({ ...signed("ORDabc123"), total_amount: "1" }));

    expect(res.status).toBe(400);
    expect(processOrderCallback).not.toHaveBeenCalled();
  });

  it("answers OK to a duplicate notification", async () => {
    vi.mocked(processOrderCallback).mockResolvedValue({ outcome: "DUPLICATE", orderId: "ord_1" });

    const res = await POST(callback(signed("ORDabc123")));

    expect(await res.text()).toBe("OK");
  });

  it("asks PayTR to retry when the order cannot be processed yet", async () => {
    vi.mocked(processOrderCallback).mockRejectedValue(new Error("No order for merchant_oid ORDabc123"));

    const res = await POST(callback(signed("ORDabc123")));

    expect(res.status).toBe(500);
  });

  it("keeps invoice (BIZ…) notifications on the existing billing path", async () => {
    vi.mocked(processPaytrCallback).mockResolvedValue({ handled: true, duplicate: false });

    const res = await POST(callback(signed("BIZten1abc123")));

    expect(await res.text()).toBe("OK");
    expect(processPaytrCallback).toHaveBeenCalled();
    expect(processOrderCallback).not.toHaveBeenCalled();
  });
});
