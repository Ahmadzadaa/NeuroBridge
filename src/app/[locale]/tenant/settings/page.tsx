import { setRequestLocale } from "next-intl/server";
import { requireRole } from "@/lib/auth-utils";
import { SettingsPageClient } from "./settings-client";
import { getTenantSettings } from "@/lib/tenant/settings-service";
import { redirect } from "next/navigation";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireRole(locale, ["TENANT_ADMIN"]);

  if (!session.user.tenantId) {
    redirect(`/${locale}/tenant`);
  }

  const settings = await getTenantSettings(session.user.tenantId);
  if (!settings) {
    redirect(`/${locale}/tenant`);
  }

  return (
    <SettingsPageClient
      userName={session.user.name ?? "Admin"}
      initialSettings={settings}
    />
  );
}
