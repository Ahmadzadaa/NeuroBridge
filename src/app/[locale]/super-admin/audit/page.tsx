import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireRole } from "@/lib/auth-utils";
import { AuditClient } from "./audit-client";

export default async function AuditPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireRole(locale, ["SUPER_ADMIN"]);
  const t = await getTranslations("nav.superAdmin");

  return (
    <AuditClient
      title={t("audit")}
      userName={session.user.name ?? "Admin"}
    />
  );
}
