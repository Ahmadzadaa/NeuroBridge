import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthSession } from "@/lib/auth/authorize";
import { parseBody } from "@/lib/validation/schemas";
import { apiErrorResponse } from "@/lib/auth/api-errors";
import { markRead } from "@/lib/notifications/notification-service";

const schema = z.object({ ids: z.array(z.string().max(50)).max(100).optional() });

/** Marks the given notifications read, or all of them when no ids are sent. */
export async function POST(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const { ids } = parseBody(schema, await request.json().catch(() => ({})));
    await markRead(session.id, ids);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
