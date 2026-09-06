import { setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { localized } from "@/lib/i18n-content";
import { AnalyticsClient } from "./analytics-client";

export default async function AnalyticsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireRole(locale, ["TENANT_ADMIN", "TENANT_VIEWER"]);

  if (!session.user.tenantId) {
    redirect(`/${locale}/tenant`);
  }

  // Filter options are rendered on the server so the page has its dropdowns
  // populated before the first fetch resolves.
  const programs = await prisma.program.findMany({
    where: { tenantId: session.user.tenantId },
    select: {
      id: true,
      name: true,
      programTrainings: { select: { trainingType: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Courses are platform-level content, so the tenant's own list is exactly
  // the set its programmes assign — the same derivation the API uses.
  const assignedKeys = [
    ...new Set(programs.flatMap((p) => p.programTrainings.map((t) => t.trainingType))),
  ];
  const trainings = assignedKeys.length
    ? await prisma.training.findMany({
        where: { key: { in: assignedKeys } },
        select: { id: true, titleAz: true, titleEn: true, titleTr: true },
      })
    : [];

  return (
    <AnalyticsClient
      userName={session.user.name ?? "Admin"}
      tenantId={session.user.tenantId}
      programs={programs.map((p) => ({ id: p.id, name: p.name }))}
      courses={trainings
        .map((t) => ({ id: t.id, name: localized(t, "title", locale) }))
        .sort((a, b) => a.name.localeCompare(b.name))}
    />
  );
}
