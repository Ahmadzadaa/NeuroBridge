import type { UserRole } from "@/lib/types";

export type Permission =
  | "tenant:read"
  | "tenant:write"
  | "tenant:delete"
  | "program:read"
  | "program:write"
  | "program:delete"
  | "participant:read"
  | "participant:write"
  | "report:read"
  | "report:export"
  | "billing:read"
  | "billing:write"
  | "settings:read"
  | "settings:write"
  | "user:read"
  | "user:write"
  | "audit:read"
  | "ai:use"
  | "badge:read"
  | "certificate:read"
  | "coin:read"
  | "platform:admin";

const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  SUPER_ADMIN: [
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
  ],
  TENANT_ADMIN: [
    "tenant:read",
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
    "ai:use",
    "badge:read",
    "certificate:read",
    "coin:read",
  ],
  TENANT_VIEWER: [
    "tenant:read",
    "program:read",
    "participant:read",
    "report:read",
    "report:export",
    "billing:read",
    "settings:read",
    "user:read",
    "badge:read",
    "certificate:read",
    "coin:read",
  ],
  PARTICIPANT: [
    "program:read",
    "ai:use",
    "badge:read",
    "certificate:read",
    "coin:read",
    "settings:read",
  ],
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function requirePermission(role: UserRole, permission: Permission): void {
  if (!hasPermission(role, permission)) {
    throw new AuthorizationError(`Role ${role} lacks permission: ${permission}`);
  }
}

export function isAdminRole(role: UserRole): boolean {
  return role === "SUPER_ADMIN" || role === "TENANT_ADMIN";
}

export function isTenantStaff(role: UserRole): boolean {
  return role === "TENANT_ADMIN" || role === "TENANT_VIEWER";
}

export class AuthorizationError extends Error {
  readonly statusCode = 403;

  constructor(message: string) {
    super(message);
    this.name = "AuthorizationError";
  }
}

export class AuthenticationError extends Error {
  readonly statusCode = 401;

  constructor(message: string) {
    super(message);
    this.name = "AuthenticationError";
  }
}

export class ValidationError extends Error {
  readonly statusCode = 400;
  readonly issues: unknown;

  constructor(message: string, issues?: unknown) {
    super(message);
    this.name = "ValidationError";
    this.issues = issues;
  }
}

export class RateLimitError extends Error {
  readonly statusCode = 429;

  constructor(message = "Too many requests") {
    super(message);
    this.name = "RateLimitError";
  }
}
