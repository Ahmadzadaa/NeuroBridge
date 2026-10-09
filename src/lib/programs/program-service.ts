import { withTenantContext } from "@/lib/db/tenant-context";
import type { TenantContext } from "@/lib/auth/session";
import {
  buildPaginatedResult,
  type PaginatedResult,
  type PaginationParams,
} from "@/lib/pagination";
import {
  CacheKeys,
  CacheTTL,
  getCached,
  invalidateTenantProgramCaches,
  setCached,
} from "@/lib/cache/cache-service";

export interface ProgramListItem {
  id: string;
  name: string;
  type: string;
  applicationStart: Date;
  applicationEnd: Date;
  simulationStart: Date | null;
  simulationEnd: Date | null;
  participantLimit: number;
  applicationToken: string;
  createdAt: Date;
  participantCount: number;
}

export async function listPrograms(
  context: TenantContext,
  tenantId: string | null,
  pagination: PaginationParams
): Promise<PaginatedResult<ProgramListItem>> {
  const cacheKey =
    tenantId !== null
      ? CacheKeys.tenantPrograms(tenantId, pagination.page, pagination.pageSize)
      : null;

  if (cacheKey) {
    const cached = await getCached<PaginatedResult<ProgramListItem>>(cacheKey);
    if (cached) return cached;
  }

  const where = tenantId ? { tenantId } : {};

  const result = await withTenantContext(context, async (tx) => {
    const [items, total] = await Promise.all([
      tx.program.findMany({
        where,
        select: {
          id: true,
          name: true,
          type: true,
          applicationStart: true,
          applicationEnd: true,
          simulationStart: true,
          simulationEnd: true,
          participantLimit: true,
          applicationToken: true,
          createdAt: true,
          _count: { select: { participants: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: pagination.skip,
        take: pagination.pageSize,
      }),
      tx.program.count({ where }),
    ]);

    return buildPaginatedResult(
      items.map((p) => ({
        id: p.id,
        name: p.name,
        type: p.type,
        applicationStart: p.applicationStart,
        applicationEnd: p.applicationEnd,
        simulationStart: p.simulationStart,
        simulationEnd: p.simulationEnd,
        participantLimit: p.participantLimit,
        applicationToken: p.applicationToken,
        createdAt: p.createdAt,
        participantCount: p._count.participants,
      })),
      total,
      pagination
    );
  });

  if (cacheKey) {
    await setCached(cacheKey, result, CacheTTL.programs);
  }

  return result;
}

export async function invalidateProgramsCacheForTenant(tenantId: string): Promise<void> {
  await invalidateTenantProgramCaches(tenantId);
}

export { invalidateTenantProgramCaches };
