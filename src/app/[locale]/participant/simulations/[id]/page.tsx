import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth-utils";
import { requireFeature } from "@/lib/tenant/require-feature";
import { prisma } from "@/lib/prisma";
import { canAccessSimulation } from "@/lib/programs/simulation-access";
import { localized, localizedText } from "@/lib/i18n-content";
import { SimulationPlayClient } from "./play-client";
import { MentorPanel } from "@/components/mentor/mentor-panel";

export default async function SimulationPlayPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const session = await requireRole(locale, ["PARTICIPANT"]);
  await requireFeature(session.user.tenantId, "simulations");

  const simulation = await prisma.simulation.findUnique({
    where: { id },
    include: { _count: { select: { rounds: true } } },
  });
  if (
    !simulation ||
    simulation._count.rounds === 0 ||
    !(await canAccessSimulation(prisma, {
      userId: session.user.id,
      tenantId: session.user.tenantId ?? null,
      simulation,
    }))
  ) {
    notFound();
  }

  const [activeRun, lastCompleted, me] = await Promise.all([
    prisma.simulationRun.findFirst({
      where: {
        simulationId: id,
        userId: session.user.id,
        status: "IN_PROGRESS",
      },
    }),
    prisma.simulationRun.findFirst({
      where: { simulationId: id, userId: session.user.id, status: "COMPLETED" },
      orderBy: { completedAt: "desc" },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { coinBalance: true },
    }),
  ]);

  // Current round content — choice deltas deliberately stay server-side;
  // the player only sees label + qualitative detail. Consequences arrive
  // with the decide response.
  const currentRound = activeRun
    ? await prisma.simulationRound.findUnique({
        where: {
          simulationId_order: {
            simulationId: id,
            order: activeRun.currentRound,
          },
        },
        include: {
          choices: {
            orderBy: { order: "asc" },
            select: { id: true, label: true, detail: true },
          },
        },
      })
    : null;

  return (
    <>
      <SimulationPlayClient
        locale={locale}
        userName={session.user.name ?? "Participant"}
        coinBalance={me?.coinBalance ?? 0}
        simulation={{
          id: simulation.id,
          name: localized(simulation, "name", locale),
          description: localizedText(simulation.description, locale),
          startCash: simulation.startCash,
          targetCash: simulation.targetCash,
          totalRounds: simulation._count.rounds,
        }}
        activeRun={
          activeRun
            ? {
                id: activeRun.id,
                currentRound: activeRun.currentRound,
                cash: activeRun.cash,
                satisfaction: activeRun.satisfaction,
                reputation: activeRun.reputation,
              }
            : null
        }
        currentRound={
          currentRound
            ? {
                order: currentRound.order,
                title: localizedText(currentRound.title, locale),
                context: localizedText(currentRound.context, locale),
                choices: currentRound.choices.map((c) => ({
                  id: c.id,
                  label: localizedText(c.label, locale),
                  detail: c.detail ? localizedText(c.detail, locale) : null,
                })),
              }
            : null
        }
        lastCompleted={
          lastCompleted
            ? {
                score: lastCompleted.score ?? 0,
                cash: lastCompleted.cash,
                satisfaction: lastCompleted.satisfaction,
                reputation: lastCompleted.reputation,
                teacherGrade: lastCompleted.teacherGrade,
                teacherMaxGrade: lastCompleted.teacherMaxGrade,
                teacherComment: lastCompleted.teacherComment,
              }
            : null
        }
      />
      <MentorPanel simulationId={simulation.id} />
    </>
  );
}
