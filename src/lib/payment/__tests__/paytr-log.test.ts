import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fingerprint,
  logPaytr,
  maskHandle,
  maskPan,
  maskSecret,
  sanitizePaytrPayload,
  sanitizeRawFormBody,
} from "@/lib/payment/paytr/paytr-log";

/**
 * These tests exist to make one class of regression loud: a new log line, or a
 * new PayTR field, that carries signing material or card data into a log
 * aggregator. Everything below asserts on what must NOT appear.
 */

const CALLBACK = {
  merchant_oid: "BIZten1abc123",
  status: "success",
  total_amount: "250000",
  hash: "5S7uSbmSHzZ0dNc1dSbG7SkrJqYQ0v3XmMbWfQKPZ0A=",
  payment_type: "card",
  utoken: "ut_9f2c4b1a",
  currency: "TL",
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("masking helpers", () => {
  it("reveals only the length of a secret", () => {
    expect(maskSecret("merchant-key-value")).toBe("[redacted:18]");
    expect(maskSecret("")).toBe("[empty]");
    expect(maskSecret(undefined)).toBe("[empty]");
  });

  it("keeps only the last four digits of a card number", () => {
    expect(maskPan("4355 0843 5508 4358")).toBe("************4358");
    expect(maskPan("12")).toBe("[redacted]");
  });

  it("turns a card handle into a stable, non-reversible fingerprint", () => {
    const masked = maskHandle("ut_9f2c4b1a");

    expect(masked).not.toContain("9f2c4b1a");
    // Stable, so two log lines about the same card can be correlated.
    expect(masked).toBe(maskHandle("ut_9f2c4b1a"));
    expect(masked).not.toBe(maskHandle("ut_other"));
  });

  it("fingerprints an empty handle without throwing", () => {
    expect(fingerprint("")).toBe("none");
  });
});

describe("sanitizePaytrPayload", () => {
  it("removes the callback hash", () => {
    const safe = sanitizePaytrPayload(CALLBACK);

    expect(safe.hash).toBe("[redacted:44]");
    expect(JSON.stringify(safe)).not.toContain(CALLBACK.hash);
  });

  it("removes signing material and merchant identity", () => {
    const safe = sanitizePaytrPayload({
      merchant_id: "123456",
      merchant_key: "the-key",
      merchant_salt: "the-salt",
      paytr_token: "token-value",
    });

    const serialized = JSON.stringify(safe);
    expect(serialized).not.toContain("the-key");
    expect(serialized).not.toContain("the-salt");
    expect(serialized).not.toContain("token-value");
    expect(serialized).not.toContain("123456");

    // Redacted outright, not fingerprinted: `paytr_token` is signing material,
    // and it ends in `_token` like the card handles do.
    expect(safe.paytr_token).toBe("[redacted:11]");
  });

  it("removes card data even though it should never reach us", () => {
    const safe = sanitizePaytrPayload({
      card_number: "4355084355084358",
      cvv: "000",
      expiry_month: "12",
      cc_owner: "PAYTR TEST",
    });

    const serialized = JSON.stringify(safe);
    expect(serialized).not.toContain("4355084355084358");
    expect(serialized).not.toContain("PAYTR TEST");
  });

  it("keeps the fields that make a payment diagnosable", () => {
    const safe = sanitizePaytrPayload(CALLBACK);

    expect(safe.merchant_oid).toBe("BIZten1abc123");
    expect(safe.status).toBe("success");
    expect(safe.total_amount).toBe("250000");
    expect(safe.payment_type).toBe("card");
  });

  /**
   * A denylist rather than an allowlist, on purpose: the point of storing the
   * raw callback is to debug fields we did not anticipate.
   */
  it("passes through unknown fields untouched", () => {
    const safe = sanitizePaytrPayload({ some_new_paytr_field: "value" });

    expect(safe.some_new_paytr_field).toBe("value");
  });
});

describe("sanitizeRawFormBody", () => {
  it("masks a form-encoded callback body", () => {
    const body = new URLSearchParams(CALLBACK).toString();
    const stored = sanitizeRawFormBody(body);

    expect(stored).not.toContain(CALLBACK.hash);
    expect(stored).toContain("BIZten1abc123");
  });

  it("records the shape of a body it cannot parse", () => {
    const stored = sanitizeRawFormBody("");

    expect(JSON.parse(stored)).toEqual({ unparsed: true, length: 0 });
  });
});

describe("logPaytr", () => {
  it("emits one JSON object per line, tagged for filtering", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => undefined);

    logPaytr("info", "callback.processed", {
      merchantOid: "BIZten1abc123",
      amount: 250000,
      mode: "sandbox",
      hashValid: true,
    });

    expect(spy).toHaveBeenCalledTimes(1);
    const line = JSON.parse(spy.mock.calls[0]![0] as string);

    expect(line.component).toBe("paytr");
    expect(line.event).toBe("callback.processed");
    expect(line.merchantOid).toBe("BIZten1abc123");
    expect(line.amount).toBe(250000);
    expect(line.hashValid).toBe(true);
    expect(typeof line.ts).toBe("string");
  });

  it("masks a secret that reaches a log call by mistake", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    logPaytr("error", "checkout.token_failed", {
      merchantOid: "BIZten1abc123",
      paytr_token: "should-never-appear",
      utoken: "ut_secret_handle",
    });

    const line = spy.mock.calls[0]![0] as string;
    expect(line).not.toContain("should-never-appear");
    expect(line).not.toContain("ut_secret_handle");
  });

  it("sends warnings and errors to the matching console channel", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);

    logPaytr("warn", "callback.rejected", { merchantOid: "BIZ1" });
    logPaytr("error", "callback.failed", { merchantOid: "BIZ1" });

    expect(warn).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledTimes(1);
  });
});
