import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth-utils";
import { requireFeature } from "@/lib/tenant/require-feature";
import { prisma } from "@/lib/prisma";
import { ScenarioEditor } from "../scenario-editor";

export default async function EditScenarioPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const session = await requireRole(locale, ["TEACHER"]);
  await requireFeature(session.user.tenantId, "teachers");

  const simulation = await prisma.simulation.findUnique({
    where: { id },
    include: {
      rounds: {
        orderBy: { order: "asc" },
        include: { choices: { orderBy: { order: "asc" } } },
      },
      _count: { select: { runs: true } },
    },
  });
  if (!simulation || simulation.createdById !== session.user.id) notFound();

  return (
    <ScenarioEditor
      locale={locale}
      userName={session.user.name ?? "Teacher"}
      scenarioId={simulation.id}
      initial={{
        name: simulation.nameAz,
        description: simulation.description ?? "",
        startCash: simulation.startCash,
        targetCash: simulation.targetCash,
        rounds: simulation.rounds.map((round) => ({
          title: round.title,
          context: round.context,
          choices: round.choices.map((choice) => ({
            label: choice.label,
            detail: choice.detail ?? "",
            cashDelta: choice.cashDelta,
            satisfactionDelta: choice.satisfactionDelta,
            reputationDelta: choice.reputationDelta,
            variance: choice.variance,
            feedback: choice.feedback,
          })),
        })),
      }}
      hasRuns={simulation._count.runs > 0}
    />
  );
}
