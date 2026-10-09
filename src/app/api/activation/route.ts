import { NextResponse } from "next/server";
import { activateAccountSchema, parseBody } from "@/lib/validation/schemas";
import { ValidationError } from "@/lib/auth/permissions";
import { activateAccount, ActivationError } from "@/lib/onboarding/activation-token";
import { recordAudit, getClientIp } from "@/lib/audit/audit-service";
import { AUDIT_ACTIONS } from "@/lib/audit/actions";
import { enforceRateLimit, getClientIdentifier } from "@/lib/security/rate-limit";

/** Public: sets the password for a freshly provisioned account and burns the link. */
export async function POST(request: Request) {
  try {
    await enforceRateLimit("registration", getClientIdentifier(request));
  } catch {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  try {
    const { token, password } = parseBody(activateAccountSchema, await request.json());
    const { userId } = await activateAccount(token, password);
    await recordAudit({
      action: AUDIT_ACTIONS.PASSWORD_CHANGED,
      userId,
      ip: getClientIp(request),
      details: { source: "activation" },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ActivationError) {
      return NextResponse.json({ error: error.message, code: error.state }, { status: 410 });
    }
    if (error instanceof ValidationError || error instanceof SyntaxError) {
      return NextResponse.json({ error: "Validation failed", code: "VALIDATION" }, { status: 400 });
    }
    console.error("Activation failed:", error);
    return NextResponse.json({ error: "Activation failed" }, { status: 500 });
  }
}
