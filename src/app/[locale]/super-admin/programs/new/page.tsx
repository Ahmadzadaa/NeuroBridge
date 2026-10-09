import { setRequestLocale } from "next-intl/server";
import { requireRole } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { listBuildableTenants } from "@/lib/tenant/entitlements";
import { trainingCatalogue } from "@/lib/programs/program-admin";
import { ProgramBuilder } from "@/components/programs/program-builder";

export default async function NewProgramPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireRole(locale, ["SUPER_ADMIN"]);

  const [tenants, trainingOptions] = await Promise.all([
    listBuildableTenants(),
    trainingCatalogue(prisma, locale),
  ]);

  return <ProgramBuilder userName={session.user.name ?? "Admin"} tenants={tenants} trainingOptions={trainingOptions} />;
}
