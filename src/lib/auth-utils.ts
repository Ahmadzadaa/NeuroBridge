import { auth, getRoleDashboardPath } from "@/auth";
import { redirect } from "next/navigation";
import type { UserRole } from "@/lib/types";
import { ADMIN_ROLES } from "@/lib/types";
import { isTwoFactorEnabled } from "@/lib/security/two-factor";

export async function requireAuth(locale: string) {
  const session = await auth();
  if (!session?.user) {
    redirect(`/${locale}/login`);
  }

  // Sessions issued while 2FA was on may still carry the setup flag.
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
