import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/authorize";
import { supportBadgeCount } from "@/lib/support/support-service";

const SUPPORT_ROLES = new Set(["SUPER_ADMIN", "TENANT_ADMIN", "TENANT_VIEWER"]);

/** The count shown next to "Support" in the menu. Zero for roles without a support inbox. */
export async function GET() {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const count = SUPPORT_ROLES.has(session.role) ? await supportBadgeCount(session) : 0;
  return NextResponse.json({ count }, { headers: { "Cache-Control": "private, no-store" } });
}
