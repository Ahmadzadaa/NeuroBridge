import { describe, expect, it } from "vitest";
import { assertTenantScope, buildTenantContext } from "@/lib/auth/session";
import type { AuthSession } from "@/lib/auth/session";

function session(overrides: Partial<AuthSession> = {}): AuthSession {
  return {
    id: "user-1",
    email: "user@test.com",
    name: "User",
    role: "TENANT_ADMIN",
    tenantId: "tenant-a",
    language: "en",
    twoFactorEnabled: false,
    twoFactorVerified: false,
    requires2FASetup: false,
    ...overrides,
  };
}

describe("tenant context isolation", () => {
  it("builds tenant context from session", () => {
    const ctx = buildTenantContext(session());
    expect(ctx.tenantId).toBe("tenant-a");
    expect(ctx.userId).toBe("user-1");
    expect(ctx.isSuperAdmin).toBe(false);
  });

  it("marks super admin context correctly", () => {
    const ctx = buildTenantContext(session({ role: "SUPER_ADMIN", tenantId: null }));
    expect(ctx.isSuperAdmin).toBe(true);
  });

  it("allows super admin cross-tenant access", () => {
    const ctx = buildTenantContext(session({ role: "SUPER_ADMIN", tenantId: null }));
    expect(() => assertTenantScope(ctx, "tenant-b")).not.toThrow();
  });

  it("denies cross-tenant access for tenant staff", () => {
    const ctx = buildTenantContext(session());
    expect(() => assertTenantScope(ctx, "tenant-b")).toThrow(
      "Cross-tenant access denied"
    );
  });

  it("allows same-tenant access for tenant staff", () => {
    const ctx = buildTenantContext(session());
    expect(() => assertTenantScope(ctx, "tenant-a")).not.toThrow();
  });
});
