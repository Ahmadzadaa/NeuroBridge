import { setRequestLocale } from "next-intl/server";
import { requireRole } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { trainingCatalogue } from "@/lib/programs/program-admin";
import { ProgramBuilder } from "@/components/programs/program-builder";

export default async function NewProgramPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireRole(locale, ["SUPER_ADMIN"]);

  const [tenants, trainingOptions] = await Promise.all([
    prisma.tenant.findMany({ where: { status: "ACTIVE" }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    trainingCatalogue(prisma, locale),
  ]);

  return <ProgramBuilder userName={session.user.name ?? "Admin"} tenants={tenants} trainingOptions={trainingOptions} />;
}
