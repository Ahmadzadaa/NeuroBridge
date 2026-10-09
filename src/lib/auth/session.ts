export interface AuthSession {
  id: string;
  email: string;
  name: string;
  role: import("@/lib/types").UserRole;
  tenantId: string | null;
  language: string;
  twoFactorEnabled: boolean;
  twoFactorVerified: boolean;
  requires2FASetup: boolean;
}

export interface TenantContext {
  tenantId: string | null;
  userId: string;
  role: import("@/lib/types").UserRole;
  isSuperAdmin: boolean;
}

export function buildTenantContext(session: AuthSession): TenantContext {
  return {
    tenantId: session.tenantId,
    userId: session.id,
    role: session.role,
    isSuperAdmin: session.role === "SUPER_ADMIN",
  };
}

export function assertTenantScope(
  context: TenantContext,
  resourceTenantId: string | null | undefined
): void {
  if (context.isSuperAdmin) return;
  if (!context.tenantId || context.tenantId !== resourceTenantId) {
    throw new Error("Cross-tenant access denied");
  }
}
