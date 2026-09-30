import { redisDel, redisGet, redisSet } from "@/lib/redis/client";

const CACHE_PREFIX = "bizsim:cache:";

export async function getCached<T>(key: string): Promise<T | null> {
  const raw = await redisGet(`${CACHE_PREFIX}${key}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function setCached<T>(
  key: string,
  value: T,
  ttlSeconds: number
): Promise<void> {
  await redisSet(`${CACHE_PREFIX}${key}`, JSON.stringify(value), ttlSeconds);
}

export async function invalidateCache(...keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  await redisDel(...keys.map((k) => `${CACHE_PREFIX}${k}`));
}

export const CacheKeys = {
  applyToken: (token: string) => `apply:token:${token}`,
  tenantPrograms: (tenantId: string, page: number, pageSize: number) =>
    `tenant:${tenantId}:programs:p${page}:s${pageSize}`,
  tenantSeats: (tenantId: string) => `tenant:${tenantId}:seats`,
  tenantSettings: (tenantId: string) => `tenant:${tenantId}:settings`,
  businessMetrics: () => "metrics:business",
  programMeta: (programId: string) => `program:${programId}:meta`,
  /**
   * The filter set is part of the key: two admins looking at different date
   * windows must not be served each other's numbers. `tenantId` leads so the
   * whole tenant can be invalidated by prefix later if needed.
   */
  tenantAnalytics: (tenantId: string, fingerprint: string) =>
    `tenant:${tenantId}:analytics:${fingerprint}`,
} as const;

export const CacheTTL = {
  apply: 60,
  programs: 120,
  seats: 30,
  settings: 300,
  metrics: 120,
  programMeta: 120,
  /**
   * One hour. The dashboard answers "how is the cohort doing", not "what
   * happened in the last minute", and the aggregation touches every progress
   * row for the tenant — so serving a slightly stale figure is worth far more
   * than recomputing it on every page load.
   */
  analytics: 3600,
} as const;

export async function invalidateTenantProgramCaches(tenantId: string): Promise<void> {
  for (let page = 1; page <= 20; page++) {
    for (const size of [25, 50, 100]) {
      await invalidateCache(CacheKeys.tenantPrograms(tenantId, page, size));
    }
  }
  await invalidateCache(CacheKeys.tenantSeats(tenantId));
}
