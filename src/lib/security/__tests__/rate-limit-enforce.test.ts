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
    for (let i = 0; i < 10; i++) {
      await enforceRateLimit("login", id);
    }
    await expect(enforceRateLimit("login", id)).rejects.toThrow(/Rate limit exceeded/);
  });
});
