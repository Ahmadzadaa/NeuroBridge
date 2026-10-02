import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/authorize";
import { listNotifications } from "@/lib/notifications/notification-service";

/** The signed-in person's latest notifications and how many are unread. */
export async function GET() {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  return NextResponse.json(await listNotifications(session.id), { headers: { "Cache-Control": "private, no-store" } });
}
