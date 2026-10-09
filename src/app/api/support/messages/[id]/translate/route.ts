import { NextResponse } from "next/server";
import { z } from "zod";
import { apiErrorResponse, authorizeApi, getAuthSession } from "@/lib/auth/authorize";
import { parseBody } from "@/lib/validation/schemas";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { isLocale, translateMessage } from "@/lib/support/translate";

const schema = z.object({ locale: z.string().refine(isLocale) });

/** Translates one support message into the reader's language, on request. */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    // Both sides of a conversation may translate it; each keeps to its own tickets.
    await authorizeApi(session.role === "SUPER_ADMIN" ? "platform:admin" : "support:read");
    await enforceRateLimit("api", session.id);
    const { locale } = parseBody(schema, await request.json());
    return NextResponse.json(await translateMessage(session, id, locale as "az" | "en" | "tr"));
  } catch (error) {
    return apiErrorResponse(error);
  }
}
