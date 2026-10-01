import type { Prisma } from "@prisma/client";
import type { AiConfig } from "@/ai/config";
import { withTenantContext } from "@/lib/db/tenant-context";

type Tx = Prisma.TransactionClient;

export type LimitReason =
  | "temporarily_blocked"
  | "too_fast"
  | "daily_messages"
  | "daily_images"
  | "images_disabled"
  | "tenant_budget";

export interface LimitSnapshot {
  userMessagesToday: number;
  userImagesToday: number;
  lastUserMessageAt: Date | null;
  tenantTokensThisMonth: number;
  globalCostTodayUsd: number;
  /** Rejections of this user inside the anomaly window. */
  recentRejections: number;
  /** When the user was last put on a temporary block, if inside the block period. */
  blockedSince: Date | null;
}

export type LimitDecision =
  | { ok: true; restricted: boolean; remaining: number }
  | { ok: false; reason: LimitReason; retryAfterSeconds?: number };

export const startOfUtcDay = (now: Date) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
export const startOfUtcMonth = (now: Date) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

/**
 * The whole limit policy as one pure function, so every rule is unit-tested.
 * Restricted mode (platform-wide daily spend reached) keeps the mentor
 * running with shorter answers and no images instead of switching it off.
 */
export function evaluateLimits(
  s: LimitSnapshot,
  limits: AiConfig["limits"],
  now: Date,
  hasImage: boolean
): LimitDecision {
  if (s.blockedSince) {
    const until = s.blockedSince.getTime() + limits.blockMinutes * 60_000;
    if (until > now.getTime()) return { ok: false, reason: "temporarily_blocked", retryAfterSeconds: Math.ceil((until - now.getTime()) / 1000) };
  }
  if (s.lastUserMessageAt) {
    const wait = s.lastUserMessageAt.getTime() + limits.minIntervalSeconds * 1000 - now.getTime();
    if (wait > 0) return { ok: false, reason: "too_fast", retryAfterSeconds: Math.ceil(wait / 1000) };
  }
  if (s.userMessagesToday >= limits.dailyMessages) return { ok: false, reason: "daily_messages" };
  if (s.tenantTokensThisMonth >= limits.tenantMonthlyTokens) return { ok: false, reason: "tenant_budget" };

  const restricted = s.globalCostTodayUsd >= limits.globalDailyUsd;
  if (hasImage) {
    if (restricted) return { ok: false, reason: "images_disabled" };
    if (s.userImagesToday >= limits.dailyImages) return { ok: false, reason: "daily_images" };
  }
  return { ok: true, restricted, remaining: Math.max(0, limits.dailyMessages - s.userMessagesToday - 1) };
}

/** True when the user has piled up enough rejections to earn a temporary block. */
export function shouldBlock(s: LimitSnapshot, limits: AiConfig["limits"]): boolean {
  return !s.blockedSince && s.recentRejections + 1 >= limits.anomalyThreshold;
}

const REJECTION_TYPES = ["LIMIT_EXCEEDED", "OFF_TOPIC", "INJECTION_SUSPECTED", "CANARY_TRIGGERED"];

/** Reads the counters, every query bound to this tenant and user. */
export async function loadLimitSnapshot(
  tx: Tx,
  scope: { tenantId: string; userId: string; userHash: string },
  limits: AiConfig["limits"],
  now: Date,
  globalCostTodayUsd: number
): Promise<LimitSnapshot> {
  const dayStart = startOfUtcDay(now);
  // Turns that failed on our side ("error") do not use up the participant's allowance.
  const own = { tenantId: scope.tenantId, userId: scope.userId, role: "user", status: { not: "error" } };
  const [messages, images, last, tenantUsage, rejections, block] = await Promise.all([
    tx.aiMessage.count({ where: { ...own, createdAt: { gte: dayStart } } }),
    tx.aiMessage.count({ where: { ...own, createdAt: { gte: dayStart }, imageKey: { not: null } } }),
    tx.aiMessage.findFirst({ where: own, orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
    tx.aiUsageLog.aggregate({
      where: { tenantId: scope.tenantId, createdAt: { gte: startOfUtcMonth(now) } },
      _sum: { inputTokens: true, outputTokens: true, cacheReadTokens: true, cacheWriteTokens: true },
    }),
    tx.aiSecurityEvent.count({
      where: {
        tenantId: scope.tenantId,
        userHash: scope.userHash,
        type: { in: REJECTION_TYPES },
        createdAt: { gte: new Date(now.getTime() - limits.anomalyWindowMinutes * 60_000) },
      },
    }),
    tx.aiSecurityEvent.findFirst({
      where: {
        tenantId: scope.tenantId,
        userHash: scope.userHash,
        type: "TEMPORARY_BLOCK",
        createdAt: { gte: new Date(now.getTime() - limits.blockMinutes * 60_000) },
      },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
  ]);
  const sum = tenantUsage._sum;
  return {
    userMessagesToday: messages,
    userImagesToday: images,
    lastUserMessageAt: last?.createdAt ?? null,
    tenantTokensThisMonth: (sum.inputTokens ?? 0) + (sum.outputTokens ?? 0) + (sum.cacheReadTokens ?? 0) + (sum.cacheWriteTokens ?? 0),
    globalCostTodayUsd,
    recentRejections: rejections,
    blockedSince: block?.createdAt ?? null,
  };
}

/**
 * Platform-wide spend today. The one deliberate cross-tenant read: it runs
 * under the super-admin flag and returns a single number, no rows.
 */
export async function globalCostToday(now: Date): Promise<number> {
  const dayStart = startOfUtcDay(now);
  const result = await withTenantContext(
    { tenantId: null, userId: "system:ai-budget", role: "SUPER_ADMIN", isSuperAdmin: true },
    (tx) => tx.aiUsageLog.aggregate({ where: { createdAt: { gte: dayStart } }, _sum: { costUsd: true } })
  );
  return result._sum.costUsd ?? 0;
}

/** Messages left today, for the panel's counter. */
export async function remainingToday(tx: Tx, scope: { tenantId: string; userId: string }, limits: AiConfig["limits"], now = new Date()) {
  const used = await tx.aiMessage.count({
    where: { tenantId: scope.tenantId, userId: scope.userId, role: "user", status: { not: "error" }, createdAt: { gte: startOfUtcDay(now) } },
  });
  return Math.max(0, limits.dailyMessages - used);
}
