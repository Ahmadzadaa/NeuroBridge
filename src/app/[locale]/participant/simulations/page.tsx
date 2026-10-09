import { setRequestLocale } from "next-intl/server";
import { localizedText } from "@/lib/i18n-content";
import { requireRole } from "@/lib/auth-utils";
import { requireFeature } from "@/lib/tenant/require-feature";
import { prisma } from "@/lib/prisma";
import { localized } from "@/lib/i18n-content";
import { accessibleSimulationsWhere } from "@/lib/programs/simulation-access";
import { SimulationsPageClient } from "./simulations-client";

export default async function SimulationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireRole(locale, ["PARTICIPANT"]);
  await requireFeature(session.user.tenantId, "simulations");

  // Platform scenarios of the participant's programmes + this tenant's own scenarios.
  const visible = await accessibleSimulationsWhere(prisma, session.user.id, session.user.tenantId ?? null);
  const [simulations, runs, me] = await Promise.all([
    prisma.simulation.findMany({
      where: visible,
      include: { _count: { select: { rounds: true } } },
    }),
    prisma.simulationRun.findMany({
      where: { userId: session.user.id },
      orderBy: { startedAt: "desc" },
      select: {
        simulationId: true,
        status: true,
        currentRound: true,
        score: true,
        teacherGrade: true,
        teacherMaxGrade: true,
      },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { coinBalance: true },
    }),
  ]);

  const items = simulations.map((simulation) => {
    const simRuns = runs.filter((r) => r.simulationId === simulation.id);
    const active = simRuns.find((r) => r.status === "IN_PROGRESS") ?? null;
    const completed = simRuns.filter((r) => r.status === "COMPLETED");
    const bestScore =
      completed.length > 0
        ? Math.max(...completed.map((r) => r.score ?? 0))
        : null;
    const graded = completed.find((r) => r.teacherGrade !== null) ?? null;

    return {
      id: simulation.id,
      name: localized(simulation, "name", locale),
      description: simulation.description ? localizedText(simulation.description, locale) : null,
      category: simulation.category,
      totalRounds: simulation._count.rounds,
      playable: simulation._count.rounds > 0,
      activeRound: active?.currentRound ?? null,
      bestScore,
      teacherGrade: graded
        ? { grade: graded.teacherGrade!, maxGrade: graded.teacherMaxGrade ?? 100 }
        : null,
    };
  });

  // Playable scenarios first.
  items.sort((a, b) => Number(b.playable) - Number(a.playable));

  return (
    <SimulationsPageClient
      locale={locale}
      userName={session.user.name ?? "Participant"}
      coinBalance={me?.coinBalance ?? 0}
      simulations={items}
    />
  );
}
