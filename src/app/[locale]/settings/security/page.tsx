import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AtSign, Building2, UserRound } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ADMIN_ROLES, type UserRole } from "@/lib/types";
import { isTwoFactorEnabled } from "@/lib/security/two-factor";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { AuthShell } from "@/components/layout/auth-shell";
import { InsetGroup, InsetRow, LargeTitle, Reveal } from "@/components/ui/ios";
import { TwoFactorCard } from "./two-factor-card";
import { ChangePasswordCard } from "./change-password-card";

type Params = { params: Promise<{ locale: string }> };
type Panel = "super-admin" | "tenant" | "participant" | "jury" | "teacher";

const PANEL: Record<UserRole, Panel> = {
  SUPER_ADMIN: "super-admin",
  TENANT_ADMIN: "tenant",
  TENANT_VIEWER: "tenant",
  PARTICIPANT: "participant",
  JURY: "jury",
  TEACHER: "teacher",
};
const ROLE_KEY: Record<Panel, string> = {
  "super-admin": "superAdmin",
  tenant: "tenant",
  participant: "participant",
  jury: "jury",
  teacher: "teacher",
};

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "account" });
  return { title: `${t("title")} · BizSim`, robots: { index: false } };
}

/**
 * Account and security for every role: password change and two-factor.
 * Deliberately not behind requireAuth, which sends admins without 2FA here —
 * this page is where they finish that setup.
 */
export default async function AccountSecurityPage({ params }: Params) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await auth();
  if (!session?.user) redirect(`/${locale}/login`);

  const [t, tc, user] = await Promise.all([
    getTranslations("account"),
    getTranslations("common"),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        twoFactorEnabled: true,
        tenant: { select: { name: true } },
      },
    }),
  ]);
  if (!user) redirect(`/${locale}/login`);

  const role = user.role as UserRole;
  const setupRequired =
    isTwoFactorEnabled() && Boolean(session.user.requires2FASetup) && ADMIN_ROLES.includes(role);
  if (setupRequired) {
    return (
      <AuthShell width="sm">
        <TwoFactorCard enabled={false} required />
      </AuthShell>
    );
  }

  const panel = PANEL[role];
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;
  return (
    <DashboardLayout panel={panel} title={t("title")} userName={name}>
      <div className="mx-auto max-w-2xl space-y-8">
        <LargeTitle title={t("title")} subtitle={t("subtitle")} />
        <Reveal index={1}>
          <InsetGroup header={t("profile")}>
            <InsetRow icon={UserRound} tone="indigo" title={name} subtitle={tc(`roles.${ROLE_KEY[panel]}`)} />
            <InsetRow icon={AtSign} tone="sky" title={t("email")} subtitle={<span className="break-all">{user.email}</span>} />
            {user.tenant && (
              <InsetRow icon={Building2} tone="violet" title={t("organisation")} subtitle={user.tenant.name} />
            )}
          </InsetGroup>
        </Reveal>
        <Reveal index={2}>
          <ChangePasswordCard />
        </Reveal>
        <Reveal index={3}>
          <TwoFactorCard enabled={user.twoFactorEnabled} required={false} />
        </Reveal>
      </div>
    </DashboardLayout>
  );
}
