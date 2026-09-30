import { createHmac } from "crypto";
import { describe, expect, it } from "vitest";
import {
  buildCallbackHash,
  buildCardDeleteToken,
  buildCardListToken,
  buildIframeToken,
  buildMerchantOid,
  buildRecurringToken,
  encodeBasket,
  isValidMerchantOid,
  verifyCallbackHash,
} from "@/lib/payment/paytr/paytr.hash";
import type { PaytrCredentials } from "@/lib/payment/paytr/paytr.types";

const CREDENTIALS: PaytrCredentials = {
  mode: "sandbox",
  merchantId: "123456",
  merchantKey: "merchant-key",
  merchantSalt: "merchant-salt",
  testMode: 1,
};

/** Independent re-implementation, so the test does not just mirror the code. */
function expectedHmac(payload: string): string {
  return createHmac("sha256", CREDENTIALS.merchantKey)
    .update(payload, "utf8")
    .digest("base64");
}

describe("encodeBasket", () => {
  it("base64-encodes the JSON basket", () => {
    const encoded = encodeBasket([["Seat licence", "25.00", 1]]);
    expect(JSON.parse(Buffer.from(encoded, "base64").toString("utf8"))).toEqual([
      ["Seat licence", "25.00", 1],
    ]);
  });
});

describe("buildIframeToken", () => {
  const input = {
    merchantOid: "BIZten1abc",
    userIp: "203.0.113.9",
    email: "admin@example.com",
    paymentAmount: 250000,
    basket: encodeBasket([["Seat licence", "2500.00", 1]]),
    noInstallment: 0 as const,
    maxInstallment: 0,
    currency: "TL" as const,
  };

  it("concatenates the documented fields in order, with the salt appended", () => {
    const hashStr =
      "123456" +
      "203.0.113.9" +
      "BIZten1abc" +
      "admin@example.com" +
      "250000" +
      input.basket +
      "0" +
      "0" +
      "TL" +
      "1";

    expect(buildIframeToken(CREDENTIALS, input)).toBe(
      expectedHmac(hashStr + "merchant-salt")
    );
  });

  it("changes when the amount changes", () => {
    const original = buildIframeToken(CREDENTIALS, input);
    const tampered = buildIframeToken(CREDENTIALS, {
      ...input,
      paymentAmount: 100,
    });
    expect(tampered).not.toBe(original);
  });
});

describe("buildCallbackHash", () => {
  const input = {
    merchantOid: "BIZten1abc",
    status: "success",
    totalAmount: "250000",
  };

  it("places the salt between merchant_oid and status", () => {
    expect(buildCallbackHash(CREDENTIALS, input)).toBe(
      expectedHmac("BIZten1abc" + "merchant-salt" + "success" + "250000")
    );
  });

  it("verifies a hash it produced", () => {
    const hash = buildCallbackHash(CREDENTIALS, input);
    expect(verifyCallbackHash(CREDENTIALS, input, hash)).toBe(true);
  });

  it("rejects a tampered amount", () => {
    const hash = buildCallbackHash(CREDENTIALS, input);
    expect(
      verifyCallbackHash(CREDENTIALS, { ...input, totalAmount: "1" }, hash)
    ).toBe(false);
  });

  it("rejects a hash of a different length without throwing", () => {
    expect(verifyCallbackHash(CREDENTIALS, input, "short")).toBe(false);
  });

  it("rejects an empty hash without throwing", () => {
    expect(verifyCallbackHash(CREDENTIALS, input, "")).toBe(false);
  });
});

describe("buildCardListToken", () => {
  it("hashes utoken + salt", () => {
    expect(buildCardListToken(CREDENTIALS, "utok_1")).toBe(
      expectedHmac("utok_1" + "merchant-salt")
    );
  });
});

describe("buildCardDeleteToken", () => {
  it("hashes ctoken before utoken", () => {
    expect(buildCardDeleteToken(CREDENTIALS, "utok_1", "ctok_1")).toBe(
      expectedHmac("ctok_1" + "utok_1" + "merchant-salt")
    );
  });
});

describe("buildRecurringToken", () => {
  it("concatenates the documented recurring fields in order", () => {
    const token = buildRecurringToken(CREDENTIALS, {
      merchantOid: "BIZten1abc",
      userIp: "203.0.113.9",
      email: "admin@example.com",
      paymentAmount: 250000,
      paymentType: "card",
      installmentCount: 0,
      currency: "TL",
      non3d: 1,
    });

    const hashStr =
      "123456" +
      "203.0.113.9" +
      "BIZten1abc" +
      "admin@example.com" +
      "250000" +
      "card" +
      "0" +
      "TL" +
      "1" +
      "1";

    expect(token).toBe(expectedHmac(hashStr + "merchant-salt"));
  });
});

describe("buildMerchantOid", () => {
  it("produces an alphanumeric id within PayTR's 64 char limit", () => {
    const oid = buildMerchantOid("cmrz1c6xe000gzuq4zrbqq0pq");
    expect(isValidMerchantOid(oid)).toBe(true);
    expect(oid.length).toBeLessThanOrEqual(64);
    expect(oid.startsWith("BIZ")).toBe(true);
  });

  it("strips non-alphanumeric characters from the tenant id", () => {
    const oid = buildMerchantOid("ten-ant_1");
    expect(oid).toContain("tenant1");
    expect(isValidMerchantOid(oid)).toBe(true);
  });

  it("does not repeat ids for the same tenant", () => {
    const ids = new Set(
      Array.from({ length: 50 }, () => buildMerchantOid("tenant1"))
    );
    expect(ids.size).toBe(50);
  });

  it("stays within the limit for a very long tenant id", () => {
    const oid = buildMerchantOid("t".repeat(200));
    expect(oid.length).toBe(64);
    expect(isValidMerchantOid(oid)).toBe(true);
  });
});
