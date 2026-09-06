import { NextResponse } from "next/server";
import { createLead } from "@/lib/leads/lead-service";
import { leadSchema, parseBody } from "@/lib/validation/schemas";
import { enforceRateLimit, getClientIdentifier } from "@/lib/security/rate-limit";
import { apiErrorResponse } from "@/lib/auth/api-errors";
import { getClientIp } from "@/lib/audit/audit-service";

export const runtime = "nodejs";

/**
 * Demo requests from the public marketing site.
 *
 * The only unauthenticated write in the application. Three layers stand in for
 * the authorisation that every other route has:
 *
 *   1. A per-IP rate limit (5 per hour) — see the `leads` bucket.
 *   2. A honeypot field that people never see and bots reliably fill.
 *   3. Strict Zod validation with hard length caps.
 *
 * The honeypot answers 200 rather than an error on purpose: a bot that is told
 * it was blocked will retry with the field cleared, whereas one that believes
 * it succeeded moves on. Nothing is written.
 */
export async function POST(request: Request) {
  try {
    await enforceRateLimit("leads", getClientIdentifier(request));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Too many requests" },
      { status: 429 },
    );
  }

  try {
    const body = parseBody(leadSchema, await request.json());

    if (body.website && body.website.trim() !== "") {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const lead = await createLead({
      name: body.name,
      company: body.company,
      email: body.email,
      phone: body.phone || null,
      seatCount: body.seatCount || null,
      message: body.message || null,
      locale: body.locale ?? null,
      source: body.source || null,
      ip: getClientIp(request),
      // Truncated: a user agent is diagnostic detail, not something worth
      // storing in full from an anonymous source.
      userAgent: request.headers.get("user-agent")?.slice(0, 300) ?? null,
    });

    // The id is intentionally not returned: the submitter has no use for it,
    // and it would let someone probe how many leads exist.
    return NextResponse.json({ ok: true, notified: lead.notified }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
