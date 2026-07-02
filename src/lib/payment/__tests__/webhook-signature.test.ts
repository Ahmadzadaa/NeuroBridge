import { createHmac } from "crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPayriffProvider } from "@/lib/payment/payriff-provider";
import { createIyzicoProvider } from "@/lib/payment/iyzico-provider";
import { createStripeProvider } from "@/lib/payment/stripe-provider";
import { PaymentVerificationError } from "@/lib/payment/types";

const PAYRIFF_SECRET = "payriff-test-webhook-secret";
const IYZICO_SECRET = "iyzico-test-secret-key";

function payriffRequest(body: string, signature: string): Request {
  return new Request("https://example.com/api/webhooks/payriff", {
    method: "POST",
    headers: { "x-payriff-signature": signature },
    body,
  });
}

describe("Payriff webhook signature verification", () => {
  beforeEach(() => {
    vi.stubEnv("PAYRIFF_API_KEY", "test-api-key");
    vi.stubEnv("PAYRIFF_MERCHANT_ID", "test-merchant");
    vi.stubEnv("PAYRIFF_WEBHOOK_SECRET", PAYRIFF_SECRET);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  const validBody = JSON.stringify({
    eventId: "evt_1",
    eventType: "order.updated",
    orderId: "order_1",
    status: "APPROVED",
    metadata: { paymentId: "pay_1", tenantId: "ten_1", seatCount: 50 },
  });

  it("rejects a webhook with an invalid signature", async () => {
    const provider = createPayriffProvider();
    await expect(
      provider.verifyWebhook(payriffRequest(validBody, "forged-signature"))
    ).rejects.toThrow(PaymentVerificationError);
  });

  it("rejects a webhook with a missing signature header", async () => {
    const provider = createPayriffProvider();
    const request = new Request("https://example.com/api/webhooks/payriff", {
      method: "POST",
      body: validBody,
    });
    await expect(provider.verifyWebhook(request)).rejects.toThrow(
      /Missing Payriff signature/
    );
  });

  it("rejects a tampered body even with a previously valid signature (replay guard)", async () => {
    const provider = createPayriffProvider();
    const signatureForOriginal = createHmac("sha256", PAYRIFF_SECRET)
      .update(validBody)
      .digest("hex");
    const tamperedBody = validBody.replace('"seatCount":50', '"seatCount":5000');
    await expect(
      provider.verifyWebhook(payriffRequest(tamperedBody, signatureForOriginal))
    ).rejects.toThrow(PaymentVerificationError);
  });

  it("accepts a webhook with a valid HMAC signature", async () => {
    const provider = createPayriffProvider();
    const signature = createHmac("sha256", PAYRIFF_SECRET)
      .update(validBody)
      .digest("hex");
    const event = await provider.verifyWebhook(payriffRequest(validBody, signature));
    expect(event.eventId).toBe("evt_1");
    expect(event.payload.eventType).toBe("payment.completed");
  });
});

describe("Iyzico webhook signature verification", () => {
  beforeEach(() => {
    vi.stubEnv("IYZICO_API_KEY", "test-api-key");
    vi.stubEnv("IYZICO_SECRET_KEY", "test-secret");
    vi.stubEnv("IYZICO_WEBHOOK_SECRET", IYZICO_SECRET);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects a webhook with an invalid signature", async () => {
    const provider = createIyzicoProvider();
    const request = new Request("https://example.com/api/webhooks/iyzico", {
      method: "POST",
      headers: { "x-iyz-signature": "forged" },
      body: JSON.stringify({ status: "SUCCESS" }),
    });
    await expect(provider.verifyWebhook(request)).rejects.toThrow(
      PaymentVerificationError
    );
  });
});

describe("Stripe webhook signature verification", () => {
  beforeEach(() => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_placeholder");
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_test_placeholder");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects a webhook with a missing signature header", async () => {
    const provider = createStripeProvider();
    const request = new Request("https://example.com/api/webhooks/stripe", {
      method: "POST",
      body: JSON.stringify({ type: "checkout.session.completed" }),
    });
    await expect(provider.verifyWebhook(request)).rejects.toThrow(
      /Missing Stripe signature/
    );
  });

  it("rejects a webhook with an invalid signature", async () => {
    const provider = createStripeProvider();
    const request = new Request("https://example.com/api/webhooks/stripe", {
      method: "POST",
      headers: { "stripe-signature": "t=123,v1=forged" },
      body: JSON.stringify({ type: "checkout.session.completed" }),
    });
    await expect(provider.verifyWebhook(request)).rejects.toThrow(
      /Invalid Stripe webhook signature/
    );
  });
});
