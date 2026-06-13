import { setRequestLocale } from "next-intl/server";
import { requireRole } from "@/lib/auth-utils";
import { SuperAdminDashboard } from "./dashboard-client";

export default async function SuperAdminPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireRole(locale, ["SUPER_ADMIN"]);

  return <SuperAdminDashboard userName={session.user.name ?? "Admin"} />;
}
