import { Redis } from "@upstash/redis";

let redisClient: Redis | null = null;
const memoryStore = new Map<string, { value: string; expiresAt: number }>();

export function isRedisAvailable(): boolean {
  if (process.env.NODE_ENV === "test") return false;
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  );
}

export function getRedisClient(): Redis {
  if (!redisClient) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) {
      throw new Error(
        "UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required"
      );
    }
    redisClient = new Redis({ url, token });
  }
  return redisClient;
}

function memoryGet(key: string): string | null {
  const entry = memoryStore.get(key);
  if (!entry || entry.expiresAt < Date.now()) {
    memoryStore.delete(key);
    return null;
  }
  return entry.value;
}

function memorySet(key: string, value: string, ttlSeconds: number): void {
  memoryStore.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

export async function redisGet(key: string): Promise<string | null> {
  if (!isRedisAvailable()) {
    return memoryGet(key);
  }

  const value = await getRedisClient().get<string>(key);
  return value ?? null;
}

export async function redisSet(
  key: string,
  value: string,
  ttlSeconds: number
): Promise<void> {
  if (!isRedisAvailable()) {
    memorySet(key, value, ttlSeconds);
    return;
  }

  await getRedisClient().set(key, value, { ex: ttlSeconds });
}

export async function redisDel(...keys: string[]): Promise<void> {
  if (keys.length === 0) return;

  if (!isRedisAvailable()) {
    for (const key of keys) memoryStore.delete(key);
    return;
  }

  await getRedisClient().del(...keys);
}

export async function redisLpush(key: string, value: string): Promise<void> {
  if (!isRedisAvailable()) {
    const listKey = `list:${key}`;
    const existing = memoryGet(listKey) ?? "[]";
    const list = JSON.parse(existing) as string[];
    list.unshift(value);
    memorySet(listKey, JSON.stringify(list), 86400);
    return;
  }

  await getRedisClient().lpush(key, value);
}

export async function redisRpop(key: string): Promise<string | null> {
  if (!isRedisAvailable()) {
    const listKey = `list:${key}`;
    const existing = memoryGet(listKey);
    if (!existing) return null;
    const list = JSON.parse(existing) as string[];
    const item = list.pop() ?? null;
    memorySet(listKey, JSON.stringify(list), 86400);
    return item;
  }

  return getRedisClient().rpop<string>(key);
}

export async function redisHset(
  key: string,
  fields: Record<string, string>
): Promise<void> {
  if (!isRedisAvailable()) {
    memorySet(`hash:${key}`, JSON.stringify(fields), 86400);
    return;
  }

  await getRedisClient().hset(key, fields);
}

export async function redisHgetall(key: string): Promise<Record<string, string>> {
  if (!isRedisAvailable()) {
    const entry = memoryGet(`hash:${key}`);
    if (!entry) return {};
    return JSON.parse(entry) as Record<string, string>;
  }

  const result = await getRedisClient().hgetall<Record<string, string>>(key);
  return result ?? {};
}

export function resetRedisMemoryForTests(): void {
  memoryStore.clear();
  redisClient = null;
}
