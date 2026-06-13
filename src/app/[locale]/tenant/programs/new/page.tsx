import { setRequestLocale } from "next-intl/server";
import { requireRole } from "@/lib/auth-utils";
import { NewProgramClient } from "./new-program-client";

export default async function NewProgramPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireRole(locale, ["TENANT_ADMIN"]);

  return <NewProgramClient userName={session.user.name ?? "Admin"} />;
}
