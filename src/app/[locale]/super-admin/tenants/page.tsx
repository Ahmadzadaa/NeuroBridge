import { setRequestLocale } from "next-intl/server";
import { requireRole } from "@/lib/auth-utils";
import { TenantsPageClient } from "./tenants-client";

export default async function TenantsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireRole(locale, ["SUPER_ADMIN"]);

  return <TenantsPageClient userName={session.user.name ?? "Admin"} />;
}
