import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { withAuthorizedHandler } from "@/lib/auth/authorize";
import { scenarioSchema, parseBody } from "@/lib/validation/schemas";
import { prisma } from "@/lib/prisma";

/** Teacher authoring: creates a tenant-scoped scenario from pure data. */
export async function POST(request: Request) {
  return withAuthorizedHandler(
    "simulation:author",
    async ({ session }) => {
      if (!session.tenantId) {
        return NextResponse.json({ error: "Tenant required" }, { status: 400 });
      }
      const body = parseBody(scenarioSchema, await request.json());

      const simulation = await prisma.simulation.create({
        data: {
          key: `custom_${randomUUID().slice(0, 12)}`,
          nameTr: body.name,
          nameEn: body.name,
          nameAz: body.name,
          category: "custom",
          description: body.description,
          startCash: body.startCash,
          targetCash: body.targetCash,
          tenantId: session.tenantId,
          createdById: session.id,
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
        select: { id: true },
      });

      return NextResponse.json({ id: simulation.id }, { status: 201 });
    },
    { requireTenant: true }
  );
}
