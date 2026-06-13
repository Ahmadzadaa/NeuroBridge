import { setRequestLocale } from "next-intl/server";
import { requireRole } from "@/lib/auth-utils";
import { BadgesPageClient } from "./badges-client";

export default async function BadgesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireRole(locale, ["PARTICIPANT"]);

  return <BadgesPageClient userName={session.user.name ?? "Participant"} locale={locale} />;
}
