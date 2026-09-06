import { describe, expect, it, vi } from "vitest";
import { generateVerifyCode, tenantCode, nextSerialNumber } from "@/lib/certificates/serial";

describe("verify code", () => {
  it("avoids characters people misread when copying a code", () => {
    const code = generateVerifyCode();
    expect(code).toHaveLength(10);
    expect(code).not.toMatch(/[0O1IL5S2Z]/);
  });

  it("does not repeat across a large sample", () => {
    const seen = new Set(Array.from({ length: 2000 }, () => generateVerifyCode()));
    expect(seen.size).toBe(2000);
  });
});

describe("tenant code", () => {
  it("folds Azerbaijani and Turkish letters to ASCII", () => {
    expect(tenantCode("Şəki Texnoparkı")).toBe("SEK");
    expect(tenantCode("İnnovasiya Agentliyi")).toBe("INN");
    expect(tenantCode("Ğüçlü")).toBe("GUC");
  });

  it("pads a short name and falls back when there are no letters", () => {
    expect(tenantCode("AB")).toBe("ABX");
    expect(tenantCode("123 -- 456")).toBe("ORG");
  });
});

describe("serial number", () => {
  it("uses the database counter so concurrent issues cannot collide", async () => {
    const upsert = vi.fn().mockResolvedValue({ lastValue: 417 });
    const tx = { certificateSequence: { upsert } } as never;

    const serial = await nextSerialNumber(tx, {
      tenantId: "t1",
      tenantName: "Demo Teknopark",
      year: 2026,
    });

    expect(serial).toBe("BIZ-2026-DEM-000417");
    // The increment must be expressed as a DB operation, not read-then-write.
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ update: { lastValue: { increment: 1 } } })
    );
  });
});
