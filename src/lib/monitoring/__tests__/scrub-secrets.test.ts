import { describe, expect, it } from "vitest";
import {
  REDACTED,
  scrubSecrets,
  scrubSentryEvent,
} from "@/lib/monitoring/scrub-secrets";

describe("scrubSecrets", () => {
  it("redacts PayTR signing material", () => {
    const result = scrubSecrets({
      merchant_id: "123456",
      merchant_key: "super-secret-key",
      merchant_salt: "super-secret-salt",
      paytr_token: "signed-token",
    });

    expect(result.merchant_key).toBe(REDACTED);
    expect(result.merchant_salt).toBe(REDACTED);
    expect(result.paytr_token).toBe(REDACTED);
  });

  it("redacts card vault handles", () => {
    const result = scrubSecrets({ utoken: "u_1", ctoken: "c_1" });
    expect(result.utoken).toBe(REDACTED);
    expect(result.ctoken).toBe(REDACTED);
  });

  it("redacts raw card fields should they ever appear", () => {
    const result = scrubSecrets({
      card_number: "4111111111111111",
      cvv: "123",
      expiry_month: "12",
    });
    expect(result.card_number).toBe(REDACTED);
    expect(result.cvv).toBe(REDACTED);
    expect(result.expiry_month).toBe(REDACTED);
  });

  it("redacts nested values", () => {
    const result = scrubSecrets({
      request: { body: { merchant_salt: "leak", amount: 2500 } },
    });
    expect(result.request.body.merchant_salt).toBe(REDACTED);
    expect(result.request.body.amount).toBe(2500);
  });

  it("redacts inside arrays", () => {
    const result = scrubSecrets([{ merchant_key: "leak" }, { amount: 1 }]);
    expect(result[0].merchant_key).toBe(REDACTED);
    expect(result[1].amount).toBe(1);
  });

  it("keeps non-secret fields intact", () => {
    const result = scrubSecrets({
      merchant_oid: "BIZten1abc",
      status: "success",
      total_amount: "250000",
    });
    expect(result).toEqual({
      merchant_oid: "BIZten1abc",
      status: "success",
      total_amount: "250000",
    });
  });

  it("survives circular references", () => {
    const node: Record<string, unknown> = { secret: "leak" };
    node.self = node;
    expect(() => scrubSecrets(node)).not.toThrow();
    expect((scrubSecrets(node) as Record<string, unknown>).secret).toBe(REDACTED);
  });

  it("passes through primitives untouched", () => {
    expect(scrubSecrets("plain")).toBe("plain");
    expect(scrubSecrets(42)).toBe(42);
    expect(scrubSecrets(null)).toBeNull();
  });
});

describe("scrubSentryEvent", () => {
  it("scrubs request, extra and breadcrumbs", () => {
    const event = scrubSentryEvent({
      request: { data: { merchant_salt: "leak" } },
      extra: { paytr_token: "leak" },
      breadcrumbs: [{ data: { utoken: "leak" } }],
    });

    expect(JSON.stringify(event)).not.toContain("leak");
  });

  it("leaves an event without sensitive sections alone", () => {
    const event = scrubSentryEvent({});
    expect(event).toEqual({});
  });
});
