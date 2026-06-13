import { setRequestLocale } from "next-intl/server";
import { requireRole } from "@/lib/auth-utils";
import { SimulationsPageClient } from "./simulations-client";

export default async function SimulationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireRole(locale, ["PARTICIPANT"]);

  return <SimulationsPageClient userName={session.user.name ?? "Participant"} />;
}
