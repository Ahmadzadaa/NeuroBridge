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
  | "training:read"
  | "training:submit"
  | "hackathon:read"
  | "hackathon:manage"
  | "hackathon:submit"
  | "hackathon:score"
  | "simulation:play"
  | "simulation:grade"
  | "simulation:author"
  | "teacher:manage"
  | "jury:manage"
  | "jury:score"
  | "support:read"
  | "support:write"
  | "platform:admin";

// SUPER_ADMIN is the platform owner: provisions tenants, oversees billing
// and audit — but does NOT operate tenant content (programs, hackathons,
// juries, trainings). Those belong exclusively to the tenant's own staff.
const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  SUPER_ADMIN: [
    "tenant:read",
    "tenant:write",
    "tenant:delete",
    "program:read",
    "participant:read",
    "report:read",
    "report:export",
    "billing:read",
    "billing:write",
    "settings:read",
    "settings:write",
    "user:read",
    "user:write",
    "audit:read",
    "badge:read",
    "certificate:read",
    "coin:read",
    "training:read",
    "hackathon:read",
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
    "training:read",
    "hackathon:read",
    "hackathon:manage",
    "simulation:grade",
    "simulation:author",
    "teacher:manage",
    "jury:manage",
    "support:read",
    "support:write",
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
    "training:read",
    "hackathon:read",
    "support:read",
  ],
  PARTICIPANT: [
    "program:read",
    "ai:use",
    "badge:read",
    "certificate:read",
    "coin:read",
    "settings:read",
    "training:read",
    "training:submit",
    "hackathon:read",
    "hackathon:submit",
    "simulation:play",
  ],
  JURY: [
    "program:read",
    "settings:read",
    "hackathon:read",
    "hackathon:score",
    "jury:score",
  ],
  TEACHER: [
    "settings:read",
    "participant:read",
    "simulation:grade",
    "simulation:author",
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
