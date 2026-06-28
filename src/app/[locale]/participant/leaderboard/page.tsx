import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireRole } from "@/lib/auth-utils";
import { PlaceholderPage } from "@/components/layout/placeholder-page";

export default async function LeaderboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireRole(locale, ["PARTICIPANT"]);
  const t = await getTranslations("nav.participant");

  return (
    <PlaceholderPage
      panel="participant"
      title={t("leaderboard")}
      userName={session.user.name ?? "Participant"}
      description="Leaderboard — rank participants by coins earned and badges collected."
    />
  );
}
