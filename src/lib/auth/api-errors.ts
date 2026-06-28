import {
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  RateLimitError,
} from "@/lib/auth/permissions";

export function apiErrorResponse(error: unknown): Response {
  if (error instanceof AuthenticationError) {
    return Response.json({ error: error.message }, { status: 401 });
  }
  if (error instanceof AuthorizationError) {
    return Response.json({ error: error.message }, { status: 403 });
  }
  if (error instanceof ValidationError) {
    return Response.json(
      { error: error.message, issues: error.issues },
      { status: 400 }
    );
  }
  if (error instanceof RateLimitError) {
    return Response.json({ error: error.message }, { status: 429 });
  }
  console.error("Unhandled API error:", error);
  return Response.json({ error: "Internal server error" }, { status: 500 });
}
