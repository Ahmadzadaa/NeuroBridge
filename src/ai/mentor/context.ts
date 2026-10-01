import type { Prisma } from "@prisma/client";
import { localized, localizedText } from "@/lib/i18n-content";
import { IDEA_DEV_TRAINING_KEY } from "@/lib/training/units-service";

type Tx = Prisma.TransactionClient;

/** "round": a decision round of a simulation; "unit": an Idea Development training unit. */
export type StageKind = "round" | "unit" | "none";

export interface MentorScope {
  simulationId: string;
  simulationName: string;
  stageKind: StageKind;
  /** Short name of the stage, used when steering an off-topic question back. */
  stageTitle: string;
  /** The stage with its situation text, for the model's context. */
  stageLabel: string;
  decisionsSummary: string;
}

/**
 * Authorisation in code, not in the prompt: the simulation must be visible to
 * this tenant (platform content, or the tenant's own), and the user must be an
 * active participant of one of this tenant's programmes that includes it.
 * Returns null for "no access", which the route turns into a 403.
 */
export async function resolveMentorScope(
  tx: Tx,
  params: { tenantId: string; userId: string; simulationId: string; locale: string }
): Promise<MentorScope | null> {
  const simulation = await tx.simulation.findUnique({
    where: { id: params.simulationId },
    select: {
      id: true,
      key: true,
      tenantId: true,
      nameAz: true,
      nameEn: true,
      nameTr: true,
      startCash: true,
      targetCash: true,
      _count: { select: { rounds: true } },
    },
  });
  if (!simulation) return null;
  if (simulation.tenantId !== null && simulation.tenantId !== params.tenantId) return null;

  const enrolment = await tx.participant.findFirst({
    where: {
      userId: params.userId,
      status: "ACTIVE",
      program: {
        tenantId: params.tenantId,
        // Platform simulations must be part of the programme; a tenant's own
        // scenarios are open to all of its active participants.
        ...(simulation.tenantId === null ? { programSimulations: { some: { simulationType: simulation.key } } } : {}),
      },
    },
    select: { id: true },
  });
  if (!enrolment) return null;

  const base = { simulationId: simulation.id, simulationName: localized(simulation, "name", params.locale) };
  if (simulation._count.rounds > 0) {
    return { ...base, ...(await roundStage(tx, params, simulation)) };
  }
  if (simulation.key === "idea_development") {
    return { ...base, ...(await unitStage(tx, params)) };
  }
  return { ...base, stageKind: "none", stageTitle: base.simulationName, stageLabel: "", decisionsSummary: "" };
}

async function roundStage(
  tx: Tx,
  params: { userId: string; simulationId: string; locale: string },
  simulation: { startCash: number; targetCash: number }
): Promise<Omit<MentorScope, "simulationId" | "simulationName">> {
  const run =
    (await tx.simulationRun.findFirst({
      where: { simulationId: params.simulationId, userId: params.userId, status: "IN_PROGRESS" },
      orderBy: { startedAt: "desc" },
    })) ??
    (await tx.simulationRun.findFirst({
      where: { simulationId: params.simulationId, userId: params.userId },
      orderBy: { startedAt: "desc" },
    }));
  if (!run) return { stageKind: "round", stageTitle: "", stageLabel: "Not started yet", decisionsSummary: "No decisions yet." };

  const [round, decisions] = await Promise.all([
    tx.simulationRound.findUnique({
      where: { simulationId_order: { simulationId: params.simulationId, order: run.currentRound } },
      select: { order: true, title: true, context: true },
    }),
    tx.simulationDecision.findMany({
      where: { runId: run.id },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        cashAfter: true,
        satisfactionAfter: true,
        reputationAfter: true,
        round: { select: { order: true, title: true } },
        choice: { select: { label: true } },
      },
    }),
  ]);

  const t = (v: string) => localizedText(v, params.locale);
  const stageTitle = run.status === "IN_PROGRESS" && round ? t(round.title) : "";
  const stageLabel =
    run.status === "IN_PROGRESS" && round
      ? `Round ${round.order}: ${t(round.title)}. Situation: ${t(round.context)}`
      : "Simulation finished";
  const lines = decisions
    .reverse()
    .map(
      (d) =>
        `Round ${d.round.order} (${t(d.round.title)}): chose "${t(d.choice.label)}" -> cash ${d.cashAfter}, satisfaction ${d.satisfactionAfter}, reputation ${d.reputationAfter}.`
    );
  const status = `Now: cash ${run.cash} (start ${simulation.startCash}, target ${simulation.targetCash}), satisfaction ${run.satisfaction}, reputation ${run.reputation}.`;
  return { stageKind: "round", stageTitle, stageLabel, decisionsSummary: [...lines, status].join(" ") || "No decisions yet." };
}

async function unitStage(
  tx: Tx,
  params: { userId: string; locale: string }
): Promise<Omit<MentorScope, "simulationId" | "simulationName">> {
  const units = await tx.lesson.findMany({
    where: { training: { key: IDEA_DEV_TRAINING_KEY }, activity: { not: null } },
    orderBy: { order: "asc" },
    select: {
      titleAz: true,
      titleEn: true,
      titleTr: true,
      unitExams: { select: { attempts: { where: { userId: params.userId }, select: { score: true, passed: true } } } },
    },
  });
  const results = units.map((u, i) => {
    const attempts = u.unitExams.flatMap((e) => e.attempts);
    return {
      n: i + 1,
      title: localized(u, "title", params.locale),
      passed: attempts.some((a) => a.passed),
      best: attempts.length ? Math.max(...attempts.map((a) => a.score)) : null,
    };
  });
  const current = results.find((r) => !r.passed);
  const done = results.filter((r) => r.passed).length;
  const scores = results.filter((r) => r.best !== null).map((r) => `unit ${r.n} test ${r.best}${r.passed ? " (passed)" : " (not passed)"}`);
  return {
    stageKind: "unit",
    stageTitle: current?.title ?? "",
    stageLabel: current ? `Unit ${current.n}: ${current.title}` : "All units completed",
    decisionsSummary: `Units passed: ${done}/${results.length}.${scores.length ? ` ${scores.join("; ")}.` : ""}`,
  };
}
