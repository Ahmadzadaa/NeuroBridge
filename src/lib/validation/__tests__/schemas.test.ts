import { describe, expect, it } from "vitest";
import {
  checkoutSchema,
  createProgramSchema,
  loginSchema,
  parseBody,
  registrationSchema,
  reportExportSchema,
  issueCertificateSchema,
} from "@/lib/validation/schemas";
import { ValidationError } from "@/lib/auth/permissions";

describe("validation schemas", () => {
  it("validates login credentials", () => {
    const result = loginSchema.safeParse({
      email: "user@example.com",
      password: "password123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects short passwords on login", () => {
    const result = loginSchema.safeParse({
      email: "user@example.com",
      password: "short",
    });
    expect(result.success).toBe(false);
  });

  it("validates registration payload", () => {
    const result = registrationSchema.safeParse({
      token: "abc123",
      email: "new@example.com",
      password: "password123",
      firstName: "Jane",
      lastName: "Doe",
    });
    expect(result.success).toBe(true);
  });

  it("rejects XSS in safeString fields", () => {
    const result = registrationSchema.safeParse({
      token: "abc123",
      email: "new@example.com",
      password: "password123",
      firstName: "<script>",
      lastName: "Doe",
    });
    expect(result.success).toBe(false);
  });

  it("validates checkout seat packages", () => {
    expect(checkoutSchema.safeParse({ seatCount: 50, provider: "PAYTR" }).success).toBe(
      true
    );
    expect(checkoutSchema.safeParse({ seatCount: 75, provider: "PAYTR" }).success).toBe(
      false
    );
  });

  it("validates program date ordering", () => {
    const result = createProgramSchema.safeParse({
      name: "Test Program",
      type: "entrepreneurship_training",
      applicationStart: "2026-06-01",
      applicationEnd: "2026-05-01",
      participantLimit: 50,
    });
    expect(result.success).toBe(false);
  });

  it("validates report export format", () => {
    const result = reportExportSchema.safeParse({
      programId: "ckp9dggo00000as71vgsl0k7",
      format: "csv",
    });
    expect(result.success).toBe(true);
  });

  it("validates certificate issue payload", () => {
    const result = issueCertificateSchema.safeParse({
      userId: "ckp9dggo00000as71vgsl0k7",
      type: "PARTICIPATION",
    });
    expect(result.success).toBe(true);
  });

  it("parseBody throws ValidationError on invalid input", () => {
    expect(() => parseBody(loginSchema, { email: "bad", password: "x" })).toThrow(
      ValidationError
    );
  });

  it("parseBody returns parsed data on success", () => {
    const data = parseBody(loginSchema, {
      email: "user@example.com",
      password: "password123",
    });
    expect(data.email).toBe("user@example.com");
  });
});
