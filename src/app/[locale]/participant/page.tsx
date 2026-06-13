import { setRequestLocale } from "next-intl/server";
import { requireRole } from "@/lib/auth-utils";
import { ParticipantDashboardClient } from "./dashboard-client";

export default async function ParticipantPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireRole(locale, ["PARTICIPANT"]);

  return <ParticipantDashboardClient userName={session.user.name ?? "Participant"} />;
}
