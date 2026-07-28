import * as Sentry from "@sentry/nextjs";
import { AUDIT_ACTIONS } from "@/lib/audit/actions";
import { emitSeatUtilizationMetric } from "@/lib/monitoring/cloudwatch";
import { isPostgresDatabase } from "@/lib/db/tenant-context";
import { prisma } from "@/lib/prisma";
import {
  CacheKeys,
  CacheTTL,
  getCached,
  setCached,
} from "@/lib/cache/cache-service";

export interface BusinessMetrics {
  registrationRate: {
    last24h: number;
    last7d: number;
    daily: Array<{ date: string; count: number }>;
  };
  paymentFailures: {
    last24h: number;
    last7d: number;
    total: number;
  };
  aiUsage: {
    last24h: number;
    last7d: number;
    daily: Array<{ date: string; count: number }>;
  };
  seatUtilization: {
    platformAverage: number;
    totalSeats: number;
    usedSeats: number;
    byTenant: Array<{
      tenantId: string;
      tenantName: string;
      seatLimit: number;
      seatsUsed: number;
      utilizationPercent: number;
    }>;
  };
  generatedAt: string;
}

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

async function countAuditActions(actions: string[], since: Date): Promise<number> {
  return prisma.auditLog.count({
    where: {
      action: { in: actions },
      createdAt: { gte: since },
    },
  });
}

async function dailyAuditCountsSql(
  actions: string[],
  days: number
): Promise<Array<{ date: string; count: number }>> {
  const since = daysAgo(days);

  const buckets = new Map<string, number>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    buckets.set(d.toISOString().slice(0, 10), 0);
  }

  if (isPostgresDatabase()) {
    const rows = await prisma.$queryRaw<Array<{ day: Date; count: bigint }>>`
      SELECT date_trunc('day', created_at) AS day, COUNT(*)::bigint AS count
      FROM audit_logs
      WHERE action = ANY(${actions})
        AND created_at >= ${since}
      GROUP BY date_trunc('day', created_at)
      ORDER BY day ASC
    `;

    for (const row of rows) {
      const key = new Date(row.day).toISOString().slice(0, 10);
      if (buckets.has(key)) {
        buckets.set(key, Number(row.count));
      }
    }
  } else {
    // SQLite (local dev): no date_trunc/ANY/:: casts — group in JS.
    const rows = await prisma.auditLog.findMany({
      where: {
        action: { in: actions },
        createdAt: { gte: since },
      },
      select: { createdAt: true },
    });

    for (const row of rows) {
      const key = row.createdAt.toISOString().slice(0, 10);
      if (buckets.has(key)) {
        buckets.set(key, (buckets.get(key) ?? 0) + 1);
      }
    }
  }

  return Array.from(buckets.entries()).map(([date, count]) => ({ date, count }));
}

export async function getBusinessMetrics(): Promise<BusinessMetrics> {
  const cacheKey = CacheKeys.businessMetrics();
  const cached = await getCached<BusinessMetrics>(cacheKey);
  if (cached) return cached;

  const now = new Date();
  const last24h = daysAgo(1);
  const last7d = daysAgo(7);

  const registrationActions = [
    AUDIT_ACTIONS.PARTICIPANT_REGISTERED,
    AUDIT_ACTIONS.USER_CREATED,
  ];

  const [
    registrations24h,
    registrations7d,
    aiUsage24h,
    aiUsage7d,
    paymentFailures24h,
    paymentFailures7d,
    paymentFailuresTotal,
    tenants,
    registrationDaily,
    aiDaily,
  ] = await Promise.all([
    countAuditActions(registrationActions, last24h),
    countAuditActions(registrationActions, last7d),
    countAuditActions([AUDIT_ACTIONS.AI_CHAT_USED], last24h),
    countAuditActions([AUDIT_ACTIONS.AI_CHAT_USED], last7d),
    countAuditActions([AUDIT_ACTIONS.PAYMENT_FAILED], last24h),
    countAuditActions([AUDIT_ACTIONS.PAYMENT_FAILED], last7d),
    prisma.payment.count({ where: { status: "FAILED" } }),
    prisma.tenant.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, name: true, seatLimit: true, seatsUsed: true },
    }),
    dailyAuditCountsSql(registrationActions, 7),
    dailyAuditCountsSql([AUDIT_ACTIONS.AI_CHAT_USED], 7),
  ]);

  const totalSeats = tenants.reduce((sum, t) => sum + t.seatLimit, 0);
  const usedSeats = tenants.reduce((sum, t) => sum + t.seatsUsed, 0);
  const platformAverage =
    totalSeats > 0 ? Math.round((usedSeats / totalSeats) * 10000) / 100 : 0;

  const byTenant = tenants
    .filter((t) => t.seatLimit > 0)
    .map((t) => ({
      tenantId: t.id,
      tenantName: t.name,
      seatLimit: t.seatLimit,
      seatsUsed: t.seatsUsed,
      utilizationPercent:
        Math.round((t.seatsUsed / t.seatLimit) * 10000) / 100,
    }))
    .sort((a, b) => b.utilizationPercent - a.utilizationPercent);

  void emitSeatUtilizationMetric(platformAverage);

  const metrics: BusinessMetrics = {
    registrationRate: {
      last24h: registrations24h,
      last7d: registrations7d,
      daily: registrationDaily,
    },
    paymentFailures: {
      last24h: paymentFailures24h,
      last7d: paymentFailures7d,
      total: paymentFailuresTotal,
    },
    aiUsage: {
      last24h: aiUsage24h,
      last7d: aiUsage7d,
      daily: aiDaily,
    },
    seatUtilization: {
      platformAverage,
      totalSeats,
      usedSeats,
      byTenant,
    },
    generatedAt: now.toISOString(),
  };

  await setCached(cacheKey, metrics, CacheTTL.metrics);
  return metrics;
}

export function captureException(error: unknown, context?: Record<string, unknown>): void {
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(error, { extra: context });
  }
}

export function captureMessage(message: string, level: Sentry.SeverityLevel = "info"): void {
  if (process.env.SENTRY_DSN) {
    Sentry.captureMessage(message, level);
  }
}
