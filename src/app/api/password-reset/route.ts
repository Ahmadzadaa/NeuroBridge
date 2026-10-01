import { NextResponse } from "next/server";
import { z } from "zod";
import { requestPasswordReset } from "@/lib/auth/password-reset";
import { getAppOrigin } from "@/lib/app-url";
import { enforceRateLimit, getClientIdentifier } from "@/lib/security/rate-limit";

const schema = z.object({
  email: z.string().trim().email().max(254),
  locale: z.string().max(5).default("tr"),
});

/** Public: "forgot password". Always 200 for a well-formed request, so it reveals nothing about accounts. */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Validation failed" }, { status: 400 });

  try {
    await enforceRateLimit("registration", getClientIdentifier(request));
    await enforceRateLimit("login", `reset:${parsed.data.email.toLowerCase()}`);
  } catch {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  try {
    await requestPasswordReset({ ...parsed.data, origin: await getAppOrigin() });
  } catch (error) {
    // Logged, not surfaced: the answer must not differ for known and unknown addresses.
    console.error("Password reset request failed:", error);
  }
  return NextResponse.json({ ok: true });
}
