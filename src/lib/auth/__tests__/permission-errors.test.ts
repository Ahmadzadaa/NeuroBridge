import { describe, expect, it } from "vitest";
import {
  ValidationError,
  AuthorizationError,
  hasPermission,
} from "@/lib/auth/permissions";

describe("permission errors", () => {
  it("stores validation issues", () => {
    const error = new ValidationError("failed", { formErrors: [], fieldErrors: {} });
    expect(error.issues).toBeDefined();
    expect(error.name).toBe("ValidationError");
  });

  it("creates authorization errors", () => {
    const error = new AuthorizationError("denied");
    expect(error.message).toBe("denied");
  });

  it("denies billing write for participants", () => {
    expect(hasPermission("PARTICIPANT", "billing:write")).toBe(false);
  });
});
