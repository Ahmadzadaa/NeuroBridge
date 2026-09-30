import { NextResponse } from "next/server";
import { withAuthorizedHandler } from "@/lib/auth/authorize";
import { getAnalyticsOverview } from "@/lib/analytics/overview-service";
import { analyticsFingerprint } from "@/lib/analytics/fingerprint";
import { CacheKeys, CacheTTL, getCached, setCached } from "@/lib/cache/cache-service";
import { analyticsQuerySchema, parseBody } from "@/lib/validation/schemas";
import type { AnalyticsOverview } from "@/lib/analytics/types";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  return withAuthorizedHandler(
    "report:read",
    async ({ session }) => {
      // The tenant in the path must be the caller's own — no exception, not
      // even for SUPER_ADMIN. Analytics is tenant content, and the platform
      // owner does not read tenant content (see lib/auth/permissions.ts).
      // A super admin has no tenantId, so this rejects them by construction.
      if (!session.tenantId || id !== session.tenantId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const { searchParams } = new URL(request.url);
      const query = parseBody(analyticsQuerySchema, {
        from: searchParams.get("from") ?? undefined,
        to: searchParams.get("to") ?? undefined,
        courseId: searchParams.get("courseId") ?? undefined,
        programId: searchParams.get("programId") ?? undefined,
      });

      const cacheKey = CacheKeys.tenantAnalytics(
        session.tenantId,
        analyticsFingerprint({ ...query, locale: session.language }),
      );

      const cached = await getCached<AnalyticsOverview>(cacheKey);
      if (cached) {
        return { ...cached, meta: { ...cached.meta, cached: true } };
      }

      const overview = await getAnalyticsOverview(
        {
          tenantId: session.tenantId,
          from: query.from,
          to: query.to,
          courseId: query.courseId,
          programId: query.programId,
        },
        session.language,
      );

      await setCached(cacheKey, overview, CacheTTL.analytics);
      return overview;
    },
    { requireTenant: true },
  );
}
