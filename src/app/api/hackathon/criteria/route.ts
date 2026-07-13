import { NextResponse } from "next/server";
import { withAuthorizedHandler } from "@/lib/auth/authorize";
import { criteriaSchema, parseBody } from "@/lib/validation/schemas";
import { prisma } from "@/lib/prisma";

export async function PUT(request: Request) {
  return withAuthorizedHandler(
    "hackathon:manage",
    async ({ session }) => {
      const body = parseBody(criteriaSchema, await request.json());

      const program = await prisma.program.findUnique({
        where: { id: body.programId },
        select: { id: true, tenantId: true, type: true },
      });
      if (!program || program.type !== "hackathon") {
        return NextResponse.json(
          { error: "Hackathon not found" },
          { status: 404 }
        );
      }
      if (session.role !== "SUPER_ADMIN" && program.tenantId !== session.tenantId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      // Replacing criteria resets any existing jury scores (cascade) —
      // acceptable while scoring hasn't started; warn in the UI.
      const criteria = await prisma.$transaction(async (tx) => {
        await tx.juryCriterion.deleteMany({ where: { programId: program.id } });
        return Promise.all(
          body.criteria.map((c, i) =>
            tx.juryCriterion.create({
              data: {
                programId: program.id,
                name: c.name,
                maxScore: c.maxScore,
                weight: c.weight,
                order: i,
              },
            })
          )
        );
      });

      return NextResponse.json({ count: criteria.length }, { status: 200 });
    },
    { requireTenant: true }
  );
}
