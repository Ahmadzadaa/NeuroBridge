import {
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  RateLimitError,
} from "@/lib/auth/permissions";

/**
 * Domain errors (billing, seats, certificates, …) carry the HTTP status they
 * should surface as, and optionally a stable machine-readable `code` for
 * clients to branch on.
 */
interface DomainError extends Error {
  statusCode: number;
  code?: string;
}

function isDomainError(error: unknown): error is DomainError {
  return (
    error instanceof Error &&
    typeof (error as Partial<DomainError>).statusCode === "number"
  );
}

export function apiErrorResponse(error: unknown): Response {
  if (error instanceof AuthenticationError) {
    return Response.json({ error: error.message }, { status: 401 });
  }
  if (error instanceof AuthorizationError) {
    return Response.json({ error: error.message }, { status: 403 });
  }
  if (error instanceof ValidationError) {
    return Response.json(
      { error: error.message, code: "VALIDATION_FAILED", issues: error.issues },
      { status: 400 }
    );
  }
  if (error instanceof RateLimitError) {
    return Response.json({ error: error.message, code: "RATE_LIMITED" }, { status: 429 });
  }

  // Domain errors know their own status; without this they would all surface
  // as 500 and clients could not tell "seat limit reached" from "server broke".
  if (isDomainError(error)) {
    const status = error.statusCode;
    if (Number.isInteger(status) && status >= 400 && status < 600) {
      return Response.json(
        error.code ? { error: error.message, code: error.code } : { error: error.message },
        { status }
      );
    }
  }

  console.error("Unhandled API error:", error);
  return Response.json({ error: "Internal server error" }, { status: 500 });
}
