import { NextResponse } from "next/server";
import { withAuthorizedHandler } from "@/lib/auth/authorize";
import { queryAuditLogs } from "@/lib/audit/audit-service";

export async function GET(request: Request) {
  return withAuthorizedHandler("audit:read", async ({ session }) => {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId") ?? undefined;
    const action = searchParams.get("action") ?? undefined;
    const userId = searchParams.get("userId") ?? undefined;
    const page = Number(searchParams.get("page") ?? "1");
    const pageSize = Number(searchParams.get("pageSize") ?? "50");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (session.role !== "SUPER_ADMIN" && tenantId && tenantId !== session.tenantId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const scopedTenantId =
      session.role === "SUPER_ADMIN" ? tenantId : session.tenantId ?? undefined;

    return queryAuditLogs({
      tenantId: scopedTenantId,
      action,
      userId,
      page: Number.isFinite(page) ? page : 1,
      pageSize: Number.isFinite(pageSize) ? pageSize : 50,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    });
  });
}
