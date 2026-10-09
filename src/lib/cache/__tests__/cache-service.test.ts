import { describe, expect, it, beforeEach } from "vitest";
import { getCached, setCached, invalidateCache } from "@/lib/cache/cache-service";
import { resetRedisMemoryForTests } from "@/lib/redis/client";

describe("cache-service", () => {
  beforeEach(() => {
    resetRedisMemoryForTests();
  });

  it("stores and retrieves cached values in memory fallback", async () => {
    await setCached("test:key", { value: 42 }, 60);
    const result = await getCached<{ value: number }>("test:key");
    expect(result?.value).toBe(42);
  });

  it("invalidates cached keys", async () => {
    await setCached("test:invalidate", "hello", 60);
    await invalidateCache("test:invalidate");
    const result = await getCached<string>("test:invalidate");
    expect(result).toBeNull();
  });
});
