import { setRequestLocale } from "next-intl/server";
import { requireRole } from "@/lib/auth-utils";
import { requireFeature } from "@/lib/tenant/require-feature";
import { prisma } from "@/lib/prisma";
import { ScenariosListClient } from "./scenarios-client";

export default async function TeacherScenariosPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireRole(locale, ["TEACHER"]);
  await requireFeature(session.user.tenantId, "teachers");

  const scenarios = await prisma.simulation.findMany({
    where: { createdById: session.user.id },
    orderBy: { key: "asc" },
    select: {
      id: true,
      nameAz: true,
      description: true,
      startCash: true,
      targetCash: true,
      _count: { select: { rounds: true, runs: true } },
    },
  });

  return (
    <ScenariosListClient
      locale={locale}
      userName={session.user.name ?? "Teacher"}
      scenarios={scenarios.map((s) => ({
        id: s.id,
        name: s.nameAz,
        description: s.description,
        startCash: s.startCash,
        targetCash: s.targetCash,
        roundCount: s._count.rounds,
        runCount: s._count.runs,
      }))}
    />
  );
}
