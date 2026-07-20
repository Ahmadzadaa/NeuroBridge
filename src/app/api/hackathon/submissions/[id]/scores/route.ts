import { NextResponse } from "next/server";
import { withAuthorizedHandler } from "@/lib/auth/authorize";
import { juryScoreSchema, parseBody } from "@/lib/validation/schemas";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  return withAuthorizedHandler("hackathon:score", async ({ session }) => {
    const body = parseBody(juryScoreSchema, await request.json());

    const submission = await prisma.projectSubmission.findUnique({
      where: { id },
      include: {
        team: { include: { program: { select: { id: true, tenantId: true } } } },
      },
    });
    if (!submission) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (submission.team.program.tenantId !== session.tenantId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const criteria = await prisma.juryCriterion.findMany({
      where: { programId: submission.team.program.id },
    });
    const criteriaById = new Map(criteria.map((c) => [c.id, c]));

    for (const entry of body.scores) {
      const criterion = criteriaById.get(entry.criterionId);
      if (!criterion) {
        return NextResponse.json(
          { error: `Unknown criterion: ${entry.criterionId}` },
          { status: 400 }
        );
      }
      if (entry.score > criterion.maxScore) {
        return NextResponse.json(
          {
            error: `Score for "${criterion.name}" exceeds max of ${criterion.maxScore}`,
          },
          { status: 400 }
        );
      }
    }

    await prisma.$transaction(
      body.scores.map((entry) =>
        prisma.juryScore.upsert({
          where: {
            submissionId_criterionId_juryUserId: {
              submissionId: id,
              criterionId: entry.criterionId,
              juryUserId: session.id,
            },
          },
          create: {
            submissionId: id,
            criterionId: entry.criterionId,
            juryUserId: session.id,
            score: entry.score,
            comment: entry.comment,
          },
          update: { score: entry.score, comment: entry.comment },
        })
      )
    );

    return NextResponse.json({ saved: body.scores.length }, { status: 200 });
  });
}
