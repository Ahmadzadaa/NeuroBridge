import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireRole } from "@/lib/auth-utils";
import { SystemDashboardClient } from "./system-dashboard-client";

export default async function SystemPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireRole(locale, ["SUPER_ADMIN"]);
  const t = await getTranslations("nav.superAdmin");

  return (
    <SystemDashboardClient
      title={t("system")}
      userName={session.user.name ?? "Admin"}
    />
  );
}
