import { NextResponse } from "next/server";
import { withAuthorizedHandler } from "@/lib/auth/authorize";
import { simulationDecideSchema, parseBody } from "@/lib/validation/schemas";
import { prisma } from "@/lib/prisma";
import {
  applyChoice,
  computeScore,
  SIMULATION_PASS_COIN_REWARD,
  SIMULATION_PASS_SCORE,
} from "@/lib/simulation/engine";

/** Applies one decision to a run and advances (or completes) it. */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  return withAuthorizedHandler("simulation:play", async ({ session }) => {
    const body = parseBody(simulationDecideSchema, await request.json());

    const run = await prisma.simulationRun.findUnique({
      where: { id },
      include: {
        simulation: {
          select: {
            targetCash: true,
            rounds: { select: { id: true, order: true }, orderBy: { order: "asc" } },
          },
        },
      },
    });
    if (!run || run.userId !== session.id) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }
    if (run.status !== "IN_PROGRESS") {
      return NextResponse.json({ error: "Run already completed" }, { status: 409 });
    }

    const currentRound = run.simulation.rounds.find(
      (r) => r.order === run.currentRound
    );
    if (!currentRound) {
      return NextResponse.json({ error: "Round not found" }, { status: 409 });
    }

    const choice = await prisma.simulationChoice.findUnique({
      where: { id: body.choiceId },
    });
    if (!choice || choice.roundId !== currentRound.id) {
      return NextResponse.json(
        { error: "Choice does not belong to the current round" },
        { status: 400 }
      );
    }

    const nextState = applyChoice(
      { cash: run.cash, satisfaction: run.satisfaction, reputation: run.reputation },
      choice
    );

    const isLastRound = run.currentRound >= run.simulation.rounds.length;
    const score = isLastRound
      ? computeScore(nextState, run.simulation.targetCash)
      : null;
    const rewarded = score !== null && score >= SIMULATION_PASS_SCORE;

    await prisma.$transaction(async (tx) => {
      await tx.simulationDecision.create({
        data: {
          runId: run.id,
          roundId: currentRound.id,
          choiceId: choice.id,
          cashAfter: nextState.cash,
          satisfactionAfter: nextState.satisfaction,
          reputationAfter: nextState.reputation,
        },
      });

      await tx.simulationRun.update({
        where: { id: run.id },
        data: {
          cash: nextState.cash,
          satisfaction: nextState.satisfaction,
          reputation: nextState.reputation,
          ...(isLastRound
            ? { status: "COMPLETED", score, completedAt: new Date() }
            : { currentRound: run.currentRound + 1 }),
        },
      });

      if (rewarded) {
        await tx.user.update({
          where: { id: session.id },
          data: { coinBalance: { increment: SIMULATION_PASS_COIN_REWARD } },
        });
        await tx.coinTransaction.create({
          data: {
            userId: session.id,
            amount: SIMULATION_PASS_COIN_REWARD,
            reason: `SIMULATION_COMPLETED:${run.simulationId}`,
          },
        });
      }
    });

    return {
      state: nextState,
      deltas: {
        cash: nextState.cash - run.cash,
        satisfaction: nextState.satisfaction - run.satisfaction,
        reputation: nextState.reputation - run.reputation,
      },
      feedback: choice.feedback,
      completed: isLastRound,
      nextRound: isLastRound ? null : run.currentRound + 1,
      score,
      coinsAwarded: rewarded ? SIMULATION_PASS_COIN_REWARD : 0,
    };
  });
}
