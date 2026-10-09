import { NextResponse } from "next/server";
import { withAuthorizedHandler } from "@/lib/auth/authorize";
import { assertFeatureEnabled } from "@/lib/tenant/features";
import { scenarioSchema, parseBody } from "@/lib/validation/schemas";
import { prisma } from "@/lib/prisma";

async function loadOwnScenario(id: string, userId: string) {
  const simulation = await prisma.simulation.findUnique({
    where: { id },
    select: { id: true, createdById: true, tenantId: true },
  });
  if (!simulation || simulation.createdById !== userId) return null;
  return simulation;
}

/** Full update: replaces all rounds/choices. Existing runs are reset. */
export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  return withAuthorizedHandler(
    "simulation:author",
    async ({ session }) => {
      await assertFeatureEnabled(session.tenantId, "teachers");
      const simulation = await loadOwnScenario(id, session.id);
      if (!simulation) {
        return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
      }
      const body = parseBody(scenarioSchema, await request.json());

      await prisma.$transaction(async (tx) => {
        // Round replacement invalidates old runs — cascade removes decisions.
        await tx.simulationRun.deleteMany({ where: { simulationId: id } });
        await tx.simulationRound.deleteMany({ where: { simulationId: id } });

        await tx.simulation.update({
          where: { id },
          data: {
            nameTr: body.name,
            nameEn: body.name,
            nameAz: body.name,
            description: body.description,
            startCash: body.startCash,
            targetCash: body.targetCash,
            rounds: {
              create: body.rounds.map((round, i) => ({
                order: i + 1,
                title: round.title,
                context: round.context,
                choices: {
                  create: round.choices.map((choice, j) => ({
                    label: choice.label,
                    detail: choice.detail,
                    cashDelta: choice.cashDelta,
                    satisfactionDelta: choice.satisfactionDelta,
                    reputationDelta: choice.reputationDelta,
                    variance: choice.variance,
                    feedback: choice.feedback,
                    order: j,
                  })),
                },
              })),
            },
          },
        });
      });

      return NextResponse.json({ updated: true });
    },
    { requireTenant: true }
  );
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  return withAuthorizedHandler(
    "simulation:author",
    async ({ session }) => {
      await assertFeatureEnabled(session.tenantId, "teachers");
      const simulation = await loadOwnScenario(id, session.id);
      if (!simulation) {
        return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
      }
      await prisma.simulation.delete({ where: { id } });
      return NextResponse.json({ deleted: true });
    },
    { requireTenant: true }
  );
}
