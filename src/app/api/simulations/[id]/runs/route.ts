import { NextResponse } from "next/server";
import { withAuthorizedHandler } from "@/lib/auth/authorize";
import { assertFeatureEnabled } from "@/lib/tenant/features";
import { prisma } from "@/lib/prisma";
import { canAccessSimulation } from "@/lib/programs/simulation-access";
import {
  START_SATISFACTION,
  START_REPUTATION,
} from "@/lib/simulation/engine";

/** Starts a run (or resumes the existing in-progress one). */
export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  return withAuthorizedHandler("simulation:play", async ({ session }) => {
    await assertFeatureEnabled(session.tenantId, "simulations");
    const simulation = await prisma.simulation.findUnique({
      where: { id },
      select: {
        id: true,
        key: true,
        startCash: true,
        tenantId: true,
        _count: { select: { rounds: true } },
      },
    });
    // Platform simulations only when the participant's programme includes them.
    if (
      !simulation ||
      simulation._count.rounds === 0 ||
      !(await canAccessSimulation(prisma, { userId: session.id, tenantId: session.tenantId, simulation }))
    ) {
      return NextResponse.json(
        { error: "Simulation is not playable" },
        { status: 404 }
      );
    }

    const existing = await prisma.simulationRun.findFirst({
      where: {
        simulationId: id,
        userId: session.id,
        status: "IN_PROGRESS",
      },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json({ id: existing.id, resumed: true });
    }

    const run = await prisma.simulationRun.create({
      data: {
        simulationId: id,
        userId: session.id,
        cash: simulation.startCash,
        satisfaction: START_SATISFACTION,
        reputation: START_REPUTATION,
      },
      select: { id: true },
    });

    return NextResponse.json({ id: run.id, resumed: false }, { status: 201 });
  });
}
