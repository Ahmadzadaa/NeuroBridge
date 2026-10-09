import { afterEach, describe, expect, it, vi } from "vitest";
import { isDemoDevBypass } from "@/lib/security/demo-bypass";

describe("isDemoDevBypass", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("NEVER bypasses 2FA in production, even for demo accounts", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(isDemoDevBypass("admin@bizsim.com")).toBe(false);
    expect(isDemoDevBypass("admin@demo-teknopark.com")).toBe(false);
    expect(isDemoDevBypass("tenant@demo-tekno.com")).toBe(false);
  });

  it("allows demo accounts to bypass 2FA in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(isDemoDevBypass("admin@bizsim.com")).toBe(true);
    expect(isDemoDevBypass("ADMIN@BIZSIM.COM")).toBe(true);
  });

  it("never bypasses for non-demo accounts in any environment", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(isDemoDevBypass("attacker@evil.com")).toBe(false);
    vi.stubEnv("NODE_ENV", "production");
    expect(isDemoDevBypass("attacker@evil.com")).toBe(false);
  });
});
