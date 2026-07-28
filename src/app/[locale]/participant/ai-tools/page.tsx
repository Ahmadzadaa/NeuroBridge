import { setRequestLocale } from "next-intl/server";
import { requireRole } from "@/lib/auth-utils";
import { requireFeature } from "@/lib/tenant/require-feature";
import { AiToolsPageClient } from "./ai-tools-client";

export default async function AiToolsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireRole(locale, ["PARTICIPANT"]);
  await requireFeature(session.user.tenantId, "aiTools");

  return <AiToolsPageClient userName={session.user.name ?? "Participant"} />;
}
