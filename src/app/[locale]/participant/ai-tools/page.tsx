import { setRequestLocale } from "next-intl/server";
import { requireRole } from "@/lib/auth-utils";
import { AiToolsPageClient } from "./ai-tools-client";

export default async function AiToolsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireRole(locale, ["PARTICIPANT"]);

  return <AiToolsPageClient userName={session.user.name ?? "Participant"} />;
}
