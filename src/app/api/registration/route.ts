import { localeUrl } from "@/lib/app-url";
import { NextResponse } from "next/server";
import { registrationSchema, parseBody } from "@/lib/validation/schemas";
import { apiErrorResponse } from "@/lib/auth/api-errors";
import { registerParticipant } from "@/lib/seats/registration-service";
import { enforceRateLimit, getClientIdentifier } from "@/lib/security/rate-limit";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email/email-service";
import { welcomeEmail } from "@/lib/email/templates";

/**
 * Every registration failure is a domain error that already knows its status
 * and its machine-readable code, so the shared mapper produces exactly the
 * responses this function used to assemble by hand — except it also carries
 * the code across, which is what the browser translates. The bad-token case
 * is the one failure with no class of its own.
 */
function mapRegistrationError(error: unknown): Response {
  if (error instanceof Error && error.message === "Invalid application token") {
    return NextResponse.json(
      { error: error.message, code: "INVALID_APPLICATION_TOKEN" },
      { status: 404 }
    );
  }
  return apiErrorResponse(error);
}

export async function POST(request: Request) {
  try {
    await enforceRateLimit("registration", getClientIdentifier(request));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Rate limited" },
      { status: 429 }
    );
  }

  try {
    const body = parseBody(registrationSchema, await request.json());
    const result = await registerParticipant({ ...body, ip: getClientIdentifier(request) });

    // Welcome email — never blocks or fails the registration itself.
    const program = await prisma.program.findUnique({
      where: { id: result.programId },
      select: { name: true },
    });
    const origin = process.env.APP_BASE_URL ?? new URL(request.url).origin;
    await sendEmail({
      to: body.email,
      ...welcomeEmail({
        firstName: body.firstName,
        programName: program?.name ?? "BizSim",
        loginUrl: localeUrl(origin, "/login", body.locale),
        language: body.locale,
      }),
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return mapRegistrationError(error);
  }
}
