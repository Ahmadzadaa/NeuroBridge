import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { enforceRateLimit } from "@/lib/security/rate-limit";

describe("rate-limit memory fallback", () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "development");
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  afterEach(() => {
    vi.stubEnv("NODE_ENV", originalNodeEnv ?? "test");
  });

  it("allows requests under the limit", async () => {
    await expect(enforceRateLimit("login", "test-client-1")).resolves.toBeUndefined();
  });

  it("throws when memory limit is exceeded", async () => {
    const id = `burst-${Date.now()}`;
    for (let i = 0; i < 5; i++) {
      await enforceRateLimit("login", id);
    }
    await expect(enforceRateLimit("login", id)).rejects.toThrow(/Rate limit exceeded/);
  });

  it("enforces login rate limiting even in development (no dev bypass)", async () => {
    const id = `dev-login-${Date.now()}`;
    for (let i = 0; i < 5; i++) {
      await enforceRateLimit("login", id);
    }
    await expect(enforceRateLimit("login", id)).rejects.toThrow(
      /Rate limit exceeded for login/
    );
  });

  it("blocks 2FA attempts after 5 tries (TOTP brute-force guard)", async () => {
    const id = `2fa-${Date.now()}`;
    for (let i = 0; i < 5; i++) {
      await enforceRateLimit("twoFactor", id);
    }
    await expect(enforceRateLimit("twoFactor", id)).rejects.toThrow(
      /Rate limit exceeded for twoFactor/
    );
  });

  it("blocks report exports after 5 per minute", async () => {
    const id = `export-${Date.now()}`;
    for (let i = 0; i < 5; i++) {
      await enforceRateLimit("export", id);
    }
    await expect(enforceRateLimit("export", id)).rejects.toThrow(
      /Rate limit exceeded for export/
    );
  });

  it("tracks per-IP and per-email login identifiers independently", async () => {
    const email = `user-${Date.now()}@test.com`;
    const ip = `ip:10.0.0.${Date.now() % 255}`;
    for (let i = 0; i < 5; i++) {
      await enforceRateLimit("login", email);
    }
    // Email identifier is exhausted, IP identifier still has budget.
    await expect(enforceRateLimit("login", email)).rejects.toThrow();
    await expect(enforceRateLimit("login", ip)).resolves.toBeUndefined();
  });
});
