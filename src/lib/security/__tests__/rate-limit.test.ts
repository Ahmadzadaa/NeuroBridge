import { describe, expect, it } from "vitest";
import { getClientIdentifier } from "@/lib/security/rate-limit";

describe("rate-limit", () => {
  it("extracts client IP from x-forwarded-for", () => {
    const request = new Request("http://localhost", {
      headers: { "x-forwarded-for": "203.0.113.1, 70.41.3.18" },
    });
    expect(getClientIdentifier(request)).toBe("203.0.113.1");
  });

  it("falls back to x-real-ip", () => {
    const request = new Request("http://localhost", {
      headers: { "x-real-ip": "198.51.100.1" },
    });
    expect(getClientIdentifier(request)).toBe("198.51.100.1");
  });

  it("returns unknown when no IP headers", () => {
    const request = new Request("http://localhost");
    expect(getClientIdentifier(request)).toBe("unknown");
  });
});
