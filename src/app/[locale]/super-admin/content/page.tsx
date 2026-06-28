import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireRole } from "@/lib/auth-utils";
import { PlaceholderPage } from "@/components/layout/placeholder-page";

export default async function ContentPage({
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
      title={t("content")}
      userName={session.user.name ?? "Admin"}
      description="Global content management — simulation modules, training content, AI prompts, and badge definitions."
    />
  );
}
