import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import bcrypt from "bcryptjs";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findFirst: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
    },
    userRecoveryCode: { update: vi.fn() },
  },
}));

vi.mock("@/lib/audit/audit-service", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/audit/audit-service")>();
  return { ...actual, recordAudit: vi.fn().mockResolvedValue(undefined) };
});

// credentials-errors imports next-auth, which cannot load in the vitest
// node environment. These error classes are not exercised by this test.
vi.mock("@/lib/auth/credentials-errors", () => ({
  AccountLockedError: class AccountLockedError extends Error {},
  TwoFactorRequiredError: class TwoFactorRequiredError extends Error {},
}));

import { authorizeCredentials } from "@/lib/auth/authorize-credentials";
import { prisma } from "@/lib/prisma";

const PASSWORD = "Sifre123!Guclu";

function loginRequest(ip: string): Request {
  return new Request("http://localhost/api/auth/callback/credentials", {
    method: "POST",
    headers: { "x-forwarded-for": ip },
  });
}

describe("login route rate limiting (per IP)", () => {
  let passwordHash: string;

  beforeEach(async () => {
    // Rate limiting is a no-op when NODE_ENV=test, so run as development
    // (memory fallback limiter, no Redis needed).
    vi.stubEnv("NODE_ENV", "development");
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    vi.mocked(prisma.user.findFirst).mockReset();
    passwordHash = await bcrypt.hash(PASSWORD, 10);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  function mockVictimUser() {
    vi.mocked(prisma.user.findFirst).mockImplementation((async (args: {
      where: { email: string };
    }) => {
      if (args?.where?.email === "victim@test.com") {
        return {
          id: "user_victim",
          email: "victim@test.com",
          passwordHash,
          firstName: "Victim",
          lastName: "User",
          role: "PARTICIPANT",
          tenantId: "tenant_1",
          language: "tr",
          twoFactorEnabled: false,
          twoFactorSecret: null,
          failedLoginAttempts: 0,
          lockedUntil: null,
          tenant: { status: "ACTIVE" },
          recoveryCodes: [],
        };
      }
      return null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any);
  }

  it("rejects the 6th login attempt from the same IP, even with VALID credentials", async () => {
    mockVictimUser();
    const attackerIp = "203.0.113.66";

    // Attempts 1-5: credential spraying with unknown emails from one IP.
    // Each is rejected (unknown user) and consumes IP rate-limit budget.
    for (let i = 1; i <= 5; i++) {
      const result = await authorizeCredentials(
        { email: `ghost${i}@test.com`, password: "WrongPass123!" },
        loginRequest(attackerIp)
      );
      expect(result).toBeNull();
    }

    const lookupsAfterFiveAttempts = vi.mocked(prisma.user.findFirst).mock
      .calls.length;
    expect(lookupsAfterFiveAttempts).toBe(5);

    // 6th attempt: CORRECT credentials for a real account, same IP.
    // Must be rejected by the rate limiter (authorize returns null -> 401),
    // not let through just because the password is right.
    const sixth = await authorizeCredentials(
      { email: "victim@test.com", password: PASSWORD },
      loginRequest(attackerIp)
    );
    expect(sixth).toBeNull();

    // Proof the limiter blocked BEFORE auth logic ran: no DB lookup,
    // no bcrypt comparison happened for the 6th attempt.
    expect(vi.mocked(prisma.user.findFirst).mock.calls.length).toBe(
      lookupsAfterFiveAttempts
    );
  });

  it("control: the same valid credentials succeed from a different IP", async () => {
    mockVictimUser();

    const result = await authorizeCredentials(
      { email: "victim@test.com", password: PASSWORD },
      loginRequest("198.51.100.10")
    );

    expect(result).not.toBeNull();
    expect(result?.email).toBe("victim@test.com");
    expect(result?.role).toBe("PARTICIPANT");
  });
});
