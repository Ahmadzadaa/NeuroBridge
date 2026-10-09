import { auth } from "@/auth";
import {
  AuthenticationError,
  AuthorizationError,
  type Permission,
  requirePermission,
} from "@/lib/auth/permissions";
import type { AuthSession, TenantContext } from "@/lib/auth/session";
import { buildTenantContext } from "@/lib/auth/session";
import type { UserRole } from "@/lib/types";
import { prisma } from "@/lib/prisma";
import { adminRequires2FA } from "@/lib/security/two-factor";
import { apiErrorResponse } from "@/lib/auth/api-errors";

export { apiErrorResponse };

export interface AuthorizedRequest {
  session: AuthSession;
  context: TenantContext;
}

export async function getAuthSession(): Promise<AuthSession | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      tenantId: true,
      language: true,
      twoFactorEnabled: true,
      tenant: { select: { status: true } },
    },
  });

  if (!user) return null;

  if (user.role !== "SUPER_ADMIN" && user.tenant?.status !== "ACTIVE") {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    name: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email,
    role: user.role as UserRole,
    tenantId: user.tenantId,
    language: user.language,
    twoFactorEnabled: user.twoFactorEnabled,
    twoFactorVerified: session.user.twoFactorVerified ?? false,
    requires2FASetup: session.user.requires2FASetup ?? false,
  };
}

export async function authorizeApi(
  permission: Permission,
  options?: {
    requireTenant?: boolean;
    allow2FASetup?: boolean;
    skip2FACheck?: boolean;
  }
): Promise<AuthorizedRequest> {
  const session = await getAuthSession();
  if (!session) {
    throw new AuthenticationError("Authentication required");
  }

  requirePermission(session.role, permission);

  if (options?.requireTenant && !session.tenantId && session.role !== "SUPER_ADMIN") {
    throw new AuthorizationError("Tenant context required");
  }

  if (!options?.skip2FACheck && adminRequires2FA(session.role)) {
    if (session.requires2FASetup && !options?.allow2FASetup) {
      throw new AuthorizationError("Two-factor authentication setup required");
    }
    if (
      session.twoFactorEnabled &&
      !session.twoFactorVerified &&
      !options?.allow2FASetup
    ) {
      throw new AuthorizationError("Two-factor authentication verification required");
    }
  }

  const context = buildTenantContext(session);
  return { session, context };
}

export async function withAuthorizedHandler<T>(
  permission: Permission,
  handler: (auth: AuthorizedRequest) => Promise<T>,
  options?: {
    requireTenant?: boolean;
    allow2FASetup?: boolean;
    skip2FACheck?: boolean;
  }
): Promise<Response> {
  try {
    const authorized = await authorizeApi(permission, options);
    const result = await handler(authorized);
    if (result instanceof Response) return result;
    return Response.json(result);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
