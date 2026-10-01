import { Ratelimit } from "@upstash/ratelimit";
import { inMemoryRateLimitAllowed } from "@/lib/env-check";
import { RateLimitError } from "@/lib/auth/permissions";
import { getRedisClient, isRedisAvailable } from "@/lib/redis/client";

export type RateLimitBucket =
  | "login"
  | "registration"
  | "twoFactor"
  | "export"
  | "ai"
  | "aiTenant"
  | "webhook"
  | "leads"
  | "api";

const WINDOW_SECONDS: Record<RateLimitBucket, number> = {
  login: 60,
  registration: 60,
  twoFactor: 60,
  export: 60,
  ai: 60,
  aiTenant: 60,
  webhook: 60,
  // An hour, not a minute: a demo form is filled in once, and a spammer
  // throttled per minute can still post 60 times an hour.
  leads: 3600,
  api: 60,
};

const LIMITS: Record<RateLimitBucket, number> = {
  login: 5,
  registration: 5,
  twoFactor: 5,
  export: 5,
  ai: 20,
  // A whole organisation's AI traffic: a full class asking at once, not one user.
  aiTenant: 300,
  webhook: 100,
  leads: 5,
  api: 120,
};

const memoryLimiters = new Map<string, { count: number; resetAt: number }>();

function getUpstashLimiter(bucket: RateLimitBucket): Ratelimit {
  return new Ratelimit({
    redis: getRedisClient(),
    limiter: Ratelimit.slidingWindow(LIMITS[bucket], `${WINDOW_SECONDS[bucket]} s`),
    prefix: `bizsim:rl:${bucket}`,
  });
}

async function checkMemoryLimit(
  bucket: RateLimitBucket,
  identifier: string
): Promise<void> {
  const key = `${bucket}:${identifier}`;
  const now = Date.now();
  const windowMs = WINDOW_SECONDS[bucket] * 1000;
  const entry = memoryLimiters.get(key);

  if (!entry || now > entry.resetAt) {
    memoryLimiters.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }

  if (entry.count >= LIMITS[bucket]) {
    throw new RateLimitError(`Rate limit exceeded for ${bucket}`);
  }

  entry.count += 1;
}

export async function enforceRateLimit(
  bucket: RateLimitBucket,
  identifier: string
): Promise<void> {
  if (process.env.NODE_ENV === "test") {
    return;
  }

  if (!isRedisAvailable()) {
    // Refusing to serve is the right default: silently degrading to a
    // per-process counter in production would weaken the limit without anyone
    // noticing. The operator can opt in explicitly for a single instance.
    if (process.env.NODE_ENV === "production" && !inMemoryRateLimitAllowed()) {
      throw new Error(
        "Rate limiting requires Upstash Redis in production, or ALLOW_IN_MEMORY_RATE_LIMIT=true for a single-instance deployment"
      );
    }
    await checkMemoryLimit(bucket, identifier);
    return;
  }

  const limiter = getUpstashLimiter(bucket);
  const result = await limiter.limit(identifier);
  if (!result.success) {
    throw new RateLimitError(`Rate limit exceeded for ${bucket}`);
  }
}

export function getClientIdentifier(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? "unknown";
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}
