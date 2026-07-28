import { NextResponse } from "next/server";
import { withAuthorizedHandler } from "@/lib/auth/authorize";
import { parsePagination } from "@/lib/pagination";
import { listInvoices } from "@/lib/billing/invoice-service";

export async function GET(request: Request) {
  return withAuthorizedHandler(
    "billing:read",
    async ({ session }) => {
      if (!session.tenantId) {
        return NextResponse.json({ error: "Tenant required" }, { status: 400 });
      }

      const url = new URL(request.url);
      return listInvoices(session.tenantId, parsePagination(url.searchParams));
    },
    { requireTenant: true }
  );
}
