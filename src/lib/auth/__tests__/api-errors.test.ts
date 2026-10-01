import { describe, expect, it } from "vitest";
import {
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  RateLimitError,
} from "@/lib/auth/permissions";
import { apiErrorResponse } from "@/lib/auth/api-errors";

describe("apiErrorResponse", () => {
  it("maps authentication errors to 401", async () => {
    const response = apiErrorResponse(new AuthenticationError("Authentication required"));
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Authentication required");
  });

  it("maps authorization errors to 403", async () => {
    const response = apiErrorResponse(new AuthorizationError("Forbidden"));
    expect(response.status).toBe(403);
  });

  it("maps validation errors to 400 with issues", async () => {
    const response = apiErrorResponse(
      new ValidationError("Validation failed", { fieldErrors: { email: ["Invalid"] } })
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.issues).toBeDefined();
    expect(body.code).toBe("VALIDATION_FAILED");
  });

  it("maps rate limit errors to 429", async () => {
    const response = apiErrorResponse(new RateLimitError("Too many requests"));
    expect(response.status).toBe(429);
  });

  it("maps unknown errors to 500", async () => {
    const response = apiErrorResponse(new Error("Unexpected"));
    expect(response.status).toBe(500);
  });
});
