import { describe, expect, it } from "vitest";
import { auditQuerySchema, recoveryCodeSchema } from "@/lib/validation/schemas";

describe("auditQuerySchema", () => {
  it("applies safe defaults when params are absent", () => {
    const result = auditQuerySchema.parse({});
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(50);
  });

  it("rejects oversized pageSize (memory exhaustion guard)", () => {
    expect(() => auditQuerySchema.parse({ pageSize: "100000" })).toThrow();
  });

  it("rejects negative and zero page numbers", () => {
    expect(() => auditQuerySchema.parse({ page: "-1" })).toThrow();
    expect(() => auditQuerySchema.parse({ page: "0" })).toThrow();
  });

  it("rejects non-numeric page input", () => {
    expect(() => auditQuerySchema.parse({ page: "abc" })).toThrow();
  });

  it("rejects invalid date strings instead of producing Invalid Date", () => {
    expect(() => auditQuerySchema.parse({ from: "not-a-date" })).toThrow();
  });

  it("accepts valid ISO dates", () => {
    const result = auditQuerySchema.parse({ from: "2026-01-01T00:00:00Z" });
    expect(result.from).toBeInstanceOf(Date);
    expect(Number.isNaN(result.from!.getTime())).toBe(false);
  });

  it("rejects non-cuid tenantId (injection/enumeration guard)", () => {
    expect(() =>
      auditQuerySchema.parse({ tenantId: "'; DROP TABLE users; --" })
    ).toThrow();
  });

  it("rejects oversized action strings", () => {
    expect(() => auditQuerySchema.parse({ action: "x".repeat(101) })).toThrow();
  });
});

describe("recoveryCodeSchema", () => {
  it("accepts a valid 10-char hex recovery code", () => {
    expect(recoveryCodeSchema.parse("A1B2C3D4E5")).toBe("A1B2C3D4E5");
  });

  it("accepts lowercase hex and trims whitespace", () => {
    expect(recoveryCodeSchema.parse("  a1b2c3d4e5  ")).toBe("a1b2c3d4e5");
  });

  it("rejects overly long input (bcrypt DoS guard)", () => {
    expect(() => recoveryCodeSchema.parse("A".repeat(10000))).toThrow();
  });

  it("rejects non-hex characters", () => {
    expect(() => recoveryCodeSchema.parse("ZZZZZZZZZZ")).toThrow();
  });

  it("rejects wrong lengths", () => {
    expect(() => recoveryCodeSchema.parse("ABC123")).toThrow();
    expect(() => recoveryCodeSchema.parse("A1B2C3D4E5F6")).toThrow();
  });
});
