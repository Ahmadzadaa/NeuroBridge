import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { AuditAction } from "@/lib/audit/actions";
import { emitBusinessMetric } from "@/lib/monitoring/cloudwatch";

export interface RecordAuditInput {
  action: AuditAction | string;
  userId?: string | null;
  tenantId?: string | null;
  ip?: string | null;
  details?: Record<string, unknown> | string | null;
  tx?: Prisma.TransactionClient;
}

export function getClientIp(request: Request | { headers: Headers }): string {
  const headers = request.headers;
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? "unknown";
  }
  const realIp = headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}

export async function recordAudit(input: RecordAuditInput): Promise<void> {
  const client = input.tx ?? prisma;
  const details =
    input.details === undefined || input.details === null
      ? null
      : typeof input.details === "string"
        ? input.details
        : JSON.stringify(input.details);

  await client.auditLog.create({
    data: {
      action: input.action,
      userId: input.userId ?? null,
      tenantId: input.tenantId ?? null,
      ip: input.ip ?? null,
      details,
    },
  });

  if (!input.tx) {
    void emitBusinessMetric(input.action, input.tenantId ?? undefined);
  }
}

export interface AuditLogQuery {
  tenantId?: string;
  action?: string;
  userId?: string;
  from?: Date;
  to?: Date;
  page?: number;
  pageSize?: number;
}

export async function queryAuditLogs(query: AuditLogQuery) {
  const page = query.page ?? 1;
  const pageSize = Math.min(query.pageSize ?? 50, 100);
  const skip = (page - 1) * pageSize;

  const where: Prisma.AuditLogWhereInput = {
    ...(query.tenantId ? { tenantId: query.tenantId } : {}),
    ...(query.action ? { action: query.action } : {}),
    ...(query.userId ? { userId: query.userId } : {}),
    ...(query.from || query.to
      ? {
          createdAt: {
            ...(query.from ? { gte: query.from } : {}),
            ...(query.to ? { lte: query.to } : {}),
          },
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      include: {
        user: { select: { email: true, firstName: true, lastName: true } },
        tenant: { select: { name: true } },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    items: items.map((item) => ({
      id: item.id,
      action: item.action,
      userId: item.userId,
      tenantId: item.tenantId,
      ip: item.ip,
      details: item.details,
      createdAt: item.createdAt,
      userEmail: item.user?.email ?? null,
      userName: item.user
        ? [item.user.firstName, item.user.lastName].filter(Boolean).join(" ")
        : null,
      tenantName: item.tenant?.name ?? null,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}
