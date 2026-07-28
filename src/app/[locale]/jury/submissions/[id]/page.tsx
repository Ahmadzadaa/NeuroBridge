import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth-utils";
import { requireFeature } from "@/lib/tenant/require-feature";
import { prisma } from "@/lib/prisma";
import { ScoreSubmissionClient } from "./score-client";

export default async function ScoreSubmissionPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const session = await requireRole(locale, ["JURY"]);
  await requireFeature(session.user.tenantId, "hackathon");

  const submission = await prisma.projectSubmission.findUnique({
    where: { id },
    include: {
      team: {
        include: {
          program: { select: { id: true, name: true, tenantId: true } },
          members: {
            include: {
              user: { select: { firstName: true, lastName: true, email: true } },
            },
          },
        },
      },
    },
  });

  if (
    !submission ||
    (session.user.tenantId &&
      submission.team.program.tenantId !== session.user.tenantId)
  ) {
    notFound();
  }

  const [criteria, myScores] = await Promise.all([
    prisma.juryCriterion.findMany({
      where: { programId: submission.team.program.id },
      orderBy: { order: "asc" },
    }),
    prisma.juryScore.findMany({
      where: { submissionId: id, juryUserId: session.user.id },
    }),
  ]);

  const scoreByCriterion = new Map(myScores.map((s) => [s.criterionId, s]));

  return (
    <ScoreSubmissionClient
      locale={locale}
      userName={session.user.name ?? "Jury"}
      submission={{
        id: submission.id,
        title: submission.title,
        summary: submission.summary,
        fileName: submission.fileName,
        version: submission.version,
        teamName: submission.team.name,
        programName: submission.team.program.name,
        members: submission.team.members.map(
          (m) =>
            [m.user.firstName, m.user.lastName].filter(Boolean).join(" ") ||
            m.user.email
        ),
      }}
      criteria={criteria.map((c) => ({
        id: c.id,
        name: c.name,
        maxScore: c.maxScore,
        weight: c.weight,
        existingScore: scoreByCriterion.get(c.id)?.score ?? null,
        existingComment: scoreByCriterion.get(c.id)?.comment ?? null,
      }))}
    />
  );
}
