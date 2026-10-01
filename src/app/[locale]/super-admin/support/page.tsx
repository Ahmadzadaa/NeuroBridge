import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireRole } from "@/lib/auth-utils";
import { PlaceholderPage } from "@/components/layout/placeholder-page";

export default async function SupportPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireRole(locale, ["SUPER_ADMIN"]);
  const t = await getTranslations("nav.superAdmin");

  return (
    <PlaceholderPage
      panel="super-admin"
      title={t("support")}
      userName={session.user.name ?? "Admin"}
      description={(await getTranslations("superAdmin.placeholders"))("support")}
    />
  );
}
