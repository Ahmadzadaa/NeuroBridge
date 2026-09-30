import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import {
  encryptSecret,
  decryptSecret,
  generateTotpSecret,
  verifyTotpCode,
  generateRecoveryCodes,
  hashRecoveryCode,
  verifyRecoveryCode,
  adminRequires2FA,
  isTwoFactorEnabled,
} from "@/lib/security/two-factor";
import { generateSync } from "otplib";

describe("two-factor security", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      TOTP_ENCRYPTION_KEY: "test-encryption-key-32-characters!!",
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("encrypts and decrypts TOTP secrets", () => {
    const plain = generateTotpSecret();
    const encrypted = encryptSecret(plain);
    expect(encrypted).not.toContain(plain);
    expect(decryptSecret(encrypted)).toBe(plain);
  });

  it("verifies valid TOTP codes", () => {
    const secret = generateTotpSecret();
    const token = generateSync({ secret });
    expect(verifyTotpCode(secret, token)).toBe(true);
    expect(verifyTotpCode(secret, "000000")).toBe(false);
  });

  it("hashes and verifies recovery codes", async () => {
    const codes = generateRecoveryCodes();
    expect(codes).toHaveLength(10);
    const hash = await hashRecoveryCode(codes[0]!);
    expect(await verifyRecoveryCode(codes[0]!, hash)).toBe(true);
    expect(await verifyRecoveryCode("WRONGCODE", hash)).toBe(false);
  });

  it("requires 2FA for admin roles only when the switch is on", () => {
    vi.stubEnv("TWO_FACTOR_ENABLED", "true");
    expect(adminRequires2FA("SUPER_ADMIN")).toBe(true);
    expect(adminRequires2FA("TENANT_ADMIN")).toBe(true);
    expect(adminRequires2FA("TENANT_VIEWER")).toBe(false);
    expect(adminRequires2FA("PARTICIPANT")).toBe(false);
    vi.unstubAllEnvs();
  });

  it("requires 2FA for nobody when the switch is off (the default)", () => {
    vi.stubEnv("TWO_FACTOR_ENABLED", "");
    expect(isTwoFactorEnabled()).toBe(false);
    expect(adminRequires2FA("SUPER_ADMIN")).toBe(false);
    expect(adminRequires2FA("TENANT_ADMIN")).toBe(false);
    vi.unstubAllEnvs();
  });
});
