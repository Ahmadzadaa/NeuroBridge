import { NextResponse } from "next/server";
import { registrationSchema, parseBody } from "@/lib/validation/schemas";
import { ValidationError } from "@/lib/auth/permissions";
import { registerParticipant } from "@/lib/seats/registration-service";
import {
  DuplicateRegistrationError,
  EmailAlreadyRegisteredError,
  ProgramCapacityReachedError,
  RegistrationClosedError,
  SeatLimitReachedError,
} from "@/lib/seats/errors";
import { enforceRateLimit, getClientIdentifier } from "@/lib/security/rate-limit";

function mapRegistrationError(error: unknown): NextResponse {
  if (error instanceof ValidationError) {
    return NextResponse.json(
      { error: error.message, issues: error.issues },
      { status: 400 }
    );
  }
  if (error instanceof SeatLimitReachedError) {
    return NextResponse.json(
      { error: error.message, code: "SEAT_LIMIT_REACHED" },
      { status: 409 }
    );
  }
  if (error instanceof ProgramCapacityReachedError) {
    return NextResponse.json(
      { error: error.message, code: "PROGRAM_CAPACITY_REACHED" },
      { status: 409 }
    );
  }
  if (
    error instanceof DuplicateRegistrationError ||
    error instanceof EmailAlreadyRegisteredError
  ) {
    return NextResponse.json({ error: error.message }, { status: 409 });
  }
  if (error instanceof RegistrationClosedError) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
  if (error instanceof Error && error.message === "Invalid application token") {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
  console.error("Registration error:", error);
  return NextResponse.json({ error: "Registration failed" }, { status: 500 });
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
    const result = await registerParticipant(body);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return mapRegistrationError(error);
  }
}
