import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPaytrProvider } from "@/lib/payment/paytr-provider";
import { PaymentVerificationError } from "@/lib/payment/types";
import { buildCallbackHash } from "@/lib/payment/paytr/paytr.hash";
import type { PaytrCredentials } from "@/lib/payment/paytr/paytr.types";

const CREDENTIALS: PaytrCredentials = {
  merchantId: "123456",
  merchantKey: "test-merchant-key",
  merchantSalt: "test-merchant-salt",
  testMode: 1,
};

function callbackRequest(fields: Record<string, string>): Request {
  const body = new URLSearchParams(fields);
  return new Request("https://example.com/api/billing/paytr/callback", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
}

function signedFields(overrides: Partial<Record<string, string>> = {}) {
  const merchantOid = overrides.merchant_oid ?? "BIZten1abc123";
  const status = overrides.status ?? "success";
  const totalAmount = overrides.total_amount ?? "250000";

  return {
    merchant_oid: merchantOid,
    status,
    total_amount: totalAmount,
    hash: buildCallbackHash(CREDENTIALS, { merchantOid, status, totalAmount }),
    ...overrides,
  };
}

describe("PayTR callback verification", () => {
  beforeEach(() => {
    vi.stubEnv("PAYTR_MERCHANT_ID", CREDENTIALS.merchantId);
    vi.stubEnv("PAYTR_MERCHANT_KEY", CREDENTIALS.merchantKey);
    vi.stubEnv("PAYTR_MERCHANT_SALT", CREDENTIALS.merchantSalt);
    vi.stubEnv("PAYTR_TEST_MODE", "1");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("accepts a callback carrying a valid hash", async () => {
    const provider = createPaytrProvider();
    const event = await provider.verifyWebhook(callbackRequest(signedFields()));

    expect(event.eventId).toBe("BIZten1abc123");
    expect(event.payload.eventType).toBe("payment.completed");
    expect(event.payload.providerRef).toBe("BIZten1abc123");
  });

  it("maps a failed payment to payment.failed", async () => {
    const provider = createPaytrProvider();
    const event = await provider.verifyWebhook(
      callbackRequest(signedFields({ status: "failed" }))
    );

    expect(event.payload.eventType).toBe("payment.failed");
  });

  it("rejects a forged hash", async () => {
    const provider = createPaytrProvider();
    await expect(
      provider.verifyWebhook(
        callbackRequest({ ...signedFields(), hash: "forged-hash-value" })
      )
    ).rejects.toThrow(PaymentVerificationError);
  });

  it("rejects a tampered amount even when the original hash is reused", async () => {
    const provider = createPaytrProvider();
    const fields = signedFields();

    await expect(
      provider.verifyWebhook(
        callbackRequest({ ...fields, total_amount: "999999" })
      )
    ).rejects.toThrow(PaymentVerificationError);
  });

  it("rejects a callback that omits the hash", async () => {
    const provider = createPaytrProvider();
    const withoutHash = { ...signedFields() };
    delete (withoutHash as Partial<typeof withoutHash>).hash;

    await expect(
      provider.verifyWebhook(callbackRequest(withoutHash as Record<string, string>))
    ).rejects.toThrow(/missing required fields/i);
  });

  it("rejects a callback for a different merchant salt", async () => {
    const provider = createPaytrProvider();
    const foreignHash = buildCallbackHash(
      { ...CREDENTIALS, merchantSalt: "someone-elses-salt" },
      { merchantOid: "BIZten1abc123", status: "success", totalAmount: "250000" }
    );

    await expect(
      provider.verifyWebhook(
        callbackRequest({ ...signedFields(), hash: foreignHash })
      )
    ).rejects.toThrow(PaymentVerificationError);
  });
});
