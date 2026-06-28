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
} as const;

export const CacheTTL = {
  apply: 60,
  programs: 120,
  seats: 30,
  settings: 300,
  metrics: 120,
  programMeta: 120,
} as const;

export async function invalidateTenantProgramCaches(tenantId: string): Promise<void> {
  for (let page = 1; page <= 20; page++) {
    for (const size of [25, 50, 100]) {
      await invalidateCache(CacheKeys.tenantPrograms(tenantId, page, size));
    }
  }
  await invalidateCache(CacheKeys.tenantSeats(tenantId));
}
