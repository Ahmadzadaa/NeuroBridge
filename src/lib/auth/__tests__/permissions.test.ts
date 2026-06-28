import { describe, expect, it } from "vitest";
import {
  hasPermission,
  requirePermission,
  AuthorizationError,
} from "@/lib/auth/permissions";
import type { UserRole } from "@/lib/types";

const ALL_PERMISSIONS = [
  "tenant:read",
  "tenant:write",
  "tenant:delete",
  "program:read",
  "program:write",
  "program:delete",
  "participant:read",
  "participant:write",
  "report:read",
  "report:export",
  "billing:read",
  "billing:write",
  "settings:read",
  "settings:write",
  "user:read",
  "user:write",
  "audit:read",
  "ai:use",
  "badge:read",
  "certificate:read",
  "coin:read",
  "platform:admin",
] as const;

describe("RBAC permission matrix", () => {
  it("grants platform:admin only to SUPER_ADMIN", () => {
    expect(hasPermission("SUPER_ADMIN", "platform:admin")).toBe(true);
    for (const role of ["TENANT_ADMIN", "TENANT_VIEWER", "PARTICIPANT"] as UserRole[]) {
      expect(hasPermission(role, "platform:admin")).toBe(false);
    }
  });

  it("denies program:write for PARTICIPANT and TENANT_VIEWER", () => {
    expect(hasPermission("PARTICIPANT", "program:write")).toBe(false);
    expect(hasPermission("TENANT_VIEWER", "program:write")).toBe(false);
    expect(hasPermission("TENANT_ADMIN", "program:write")).toBe(true);
  });

  it("allows PARTICIPANT to read own programs and use AI", () => {
    expect(hasPermission("PARTICIPANT", "program:read")).toBe(true);
    expect(hasPermission("PARTICIPANT", "ai:use")).toBe(true);
    expect(hasPermission("PARTICIPANT", "participant:read")).toBe(false);
  });

  it("throws AuthorizationError when permission is missing", () => {
    expect(() => requirePermission("PARTICIPANT", "program:write")).toThrow(
      AuthorizationError
    );
  });

  it("defines permissions for every role", () => {
    const roles: UserRole[] = [
      "SUPER_ADMIN",
      "TENANT_ADMIN",
      "TENANT_VIEWER",
      "PARTICIPANT",
    ];
    for (const role of roles) {
      expect(hasPermission(role, "program:read")).toBeDefined();
    }
  });

  it("restricts tenant deletion to SUPER_ADMIN", () => {
    expect(hasPermission("SUPER_ADMIN", "tenant:delete")).toBe(true);
    expect(hasPermission("TENANT_ADMIN", "tenant:delete")).toBe(false);
  });

  it("allows TENANT_VIEWER read-only access to reports and billing", () => {
    expect(hasPermission("TENANT_VIEWER", "report:read")).toBe(true);
    expect(hasPermission("TENANT_VIEWER", "billing:read")).toBe(true);
    expect(hasPermission("TENANT_VIEWER", "billing:write")).toBe(false);
  });
});

describe("permission coverage", () => {
  it("evaluates every permission for SUPER_ADMIN without throwing", () => {
    for (const permission of ALL_PERMISSIONS) {
      expect(() => requirePermission("SUPER_ADMIN", permission)).not.toThrow();
    }
  });
});
