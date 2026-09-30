import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import bcrypt from "bcryptjs";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findFirst: vi.fn(), update: vi.fn().mockResolvedValue({}) },
    userRecoveryCode: { update: vi.fn() },
  },
}));

vi.mock("@/lib/audit/audit-service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/audit/audit-service")>();
  return { ...actual, recordAudit: vi.fn().mockResolvedValue(undefined) };
});

// credentials-errors imports next-auth, which cannot load in vitest.
vi.mock("@/lib/auth/credentials-errors", () => ({
  AccountLockedError: class AccountLockedError extends Error {},
  TwoFactorRequiredError: class TwoFactorRequiredError extends Error {},
}));

import { authorizeCredentials } from "@/lib/auth/authorize-credentials";
import { TwoFactorRequiredError } from "@/lib/auth/credentials-errors";
import { prisma } from "@/lib/prisma";
import { encryptSecret, generateTotpSecret } from "@/lib/security/two-factor";

const PASSWORD = "Sifre123!Guclu";
let passwordHash: string;

function mockAdmin(twoFactorEnabled: boolean) {
  vi.mocked(prisma.user.findFirst).mockResolvedValue({
    id: "usr_admin",
    email: "rector@uni.test",
    passwordHash,
    firstName: "Test",
    lastName: "Admin",
    role: "TENANT_ADMIN",
    tenantId: "ten_1",
    language: "az",
    twoFactorEnabled,
    twoFactorSecret: twoFactorEnabled ? encryptSecret(generateTotpSecret()) : null,
    failedLoginAttempts: 0,
    lockedUntil: null,
    tenant: { status: "ACTIVE" },
    recoveryCodes: [],
  } as never);
}

const login = () =>
  authorizeCredentials(
    { email: "rector@uni.test", password: PASSWORD },
    new Request("http://localhost/api/auth/callback/credentials", { method: "POST" })
  );

describe("global 2FA switch", () => {
  beforeAll(async () => {
    process.env.TOTP_ENCRYPTION_KEY ??= "test-totp-encryption-key-32-characters!";
    passwordHash = await bcrypt.hash(PASSWORD, 4);
  });

  afterEach(() => vi.unstubAllEnvs());

  it("lets an admin with 2FA enabled sign in with just a password when off", async () => {
    vi.stubEnv("TWO_FACTOR_ENABLED", "false");
    mockAdmin(true);

    const user = await login();

    expect(user).toMatchObject({ id: "usr_admin", twoFactorVerified: true, requires2FASetup: false });
  });

  it("does not push an admin without 2FA into setup when off", async () => {
    vi.stubEnv("TWO_FACTOR_ENABLED", "false");
    mockAdmin(false);

    expect(await login()).toMatchObject({ requires2FASetup: false, twoFactorVerified: true });
  });

  it("still demands the code when switched back on", async () => {
    vi.stubEnv("TWO_FACTOR_ENABLED", "true");
    mockAdmin(false);
    expect(await login()).toMatchObject({ requires2FASetup: true });

    vi.spyOn(console, "error").mockImplementation(() => undefined);
    mockAdmin(true);
    await expect(login()).rejects.toBeInstanceOf(TwoFactorRequiredError);
  });
});
