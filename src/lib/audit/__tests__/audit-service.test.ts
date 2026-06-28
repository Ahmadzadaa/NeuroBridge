import { describe, expect, it } from "vitest";
import { getClientIp } from "@/lib/audit/audit-service";
import { AUDIT_ACTIONS } from "@/lib/audit/actions";

describe("audit-service", () => {
  it("extracts client IP from x-forwarded-for", () => {
    const request = new Request("http://localhost", {
      headers: { "x-forwarded-for": "203.0.113.1, 10.0.0.1" },
    });
    expect(getClientIp(request)).toBe("203.0.113.1");
  });

  it("falls back to x-real-ip", () => {
    const request = new Request("http://localhost", {
      headers: { "x-real-ip": "198.51.100.42" },
    });
    expect(getClientIp(request)).toBe("198.51.100.42");
  });

  it("returns unknown when no IP headers present", () => {
    const request = new Request("http://localhost");
    expect(getClientIp(request)).toBe("unknown");
  });
});

describe("audit actions", () => {
  it("defines required Phase 3 actions", () => {
    expect(AUDIT_ACTIONS.LOGIN_SUCCESS).toBe("LOGIN_SUCCESS");
    expect(AUDIT_ACTIONS.LOGOUT).toBe("LOGOUT");
    expect(AUDIT_ACTIONS.REPORT_EXPORTED).toBe("REPORT_EXPORTED");
    expect(AUDIT_ACTIONS.SETTINGS_UPDATED).toBe("SETTINGS_UPDATED");
    expect(AUDIT_ACTIONS.ROLE_CHANGED).toBe("ROLE_CHANGED");
  });
});
