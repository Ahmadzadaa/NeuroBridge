import { setRequestLocale } from "next-intl/server";
import { requireRole } from "@/lib/auth-utils";
import { ProgramsPageClient } from "./programs-client";

export default async function ProgramsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireRole(locale, ["TENANT_ADMIN", "TENANT_VIEWER"]);

  return <ProgramsPageClient userName={session.user.name ?? "Admin"} />;
}
