import { auth, getRoleDashboardPath } from "@/auth";
import { redirect } from "next/navigation";
import type { UserRole } from "@/lib/types";
import { ADMIN_ROLES } from "@/lib/types";
import { isTwoFactorEnabled } from "@/lib/security/two-factor";
import { prisma } from "@/lib/prisma";

export async function requireAuth(locale: string) {
  const session = await auth();
  if (!session?.user) {
    redirect(`/${locale}/login`);
  }

  // Sessions issued while 2FA was on may still carry the setup flag.
  // The token outlives the row it describes. After a database reset, a deleted
  // account, or a suspended tenant, the page would still render from the cookie
  // while every API call behind it answered 401 — which reads as "the feature is
  // broken" rather than "you are signed out". Send the browser to login instead.
  const account = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, tenant: { select: { status: true } } },
  });
  // A user with no tenant yet (mid-onboarding) is left alone; only a missing
  // account or a tenant that has been suspended sends them back to login.
  const tenantSuspended =
    account?.role !== "SUPER_ADMIN" &&
    account?.tenant != null &&
    account.tenant.status !== "ACTIVE";
  if (!account || tenantSuspended) {
    redirect(`/${locale}/login`);
  }

  if (
    isTwoFactorEnabled() &&
    session.user.requires2FASetup &&
    ADMIN_ROLES.includes(session.user.role)
  ) {
    redirect(`/${locale}/settings/security`);
  }

  return session;
}

export async function requireRole(locale: string, allowedRoles: UserRole[]) {
  const session = await requireAuth(locale);
  if (!allowedRoles.includes(session.user.role)) {
    redirect(getRoleDashboardPath(session.user.role, locale));
  }
  return session;
}
