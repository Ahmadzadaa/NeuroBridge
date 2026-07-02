import { NextResponse } from "next/server";
import { withAuthorizedHandler } from "@/lib/auth/authorize";
import { queryAuditLogs } from "@/lib/audit/audit-service";
import { auditQuerySchema, parseBody } from "@/lib/validation/schemas";

export async function GET(request: Request) {
  return withAuthorizedHandler("audit:read", async ({ session }) => {
    const { searchParams } = new URL(request.url);
    const query = parseBody(auditQuerySchema, {
      tenantId: searchParams.get("tenantId") ?? undefined,
      action: searchParams.get("action") ?? undefined,
      userId: searchParams.get("userId") ?? undefined,
      page: searchParams.get("page") ?? undefined,
      pageSize: searchParams.get("pageSize") ?? undefined,
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
    });

    if (
      session.role !== "SUPER_ADMIN" &&
      query.tenantId &&
      query.tenantId !== session.tenantId
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const scopedTenantId =
      session.role === "SUPER_ADMIN" ? query.tenantId : session.tenantId ?? undefined;

    return queryAuditLogs({
      tenantId: scopedTenantId,
      action: query.action,
      userId: query.userId,
      page: query.page,
      pageSize: query.pageSize,
      from: query.from,
      to: query.to,
    });
  });
}
