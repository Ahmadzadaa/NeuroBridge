import { setRequestLocale } from "next-intl/server";
import { requireRole } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { JuryDashboardClient } from "./jury-client";

export default async function JuryDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireRole(locale, ["JURY"]);

  const programs = await prisma.program.findMany({
    where: {
      type: "hackathon",
      ...(session.user.tenantId ? { tenantId: session.user.tenantId } : {}),
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true },
  });
  const programIds = programs.map((p) => p.id);

  const [teams, criteria, myScores] = await Promise.all([
    prisma.hackathonTeam.findMany({
      where: { programId: { in: programIds } },
      include: {
        submissions: { orderBy: { version: "desc" }, take: 1 },
        _count: { select: { members: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.juryCriterion.findMany({
      where: { programId: { in: programIds } },
      select: { id: true, programId: true },
    }),
    prisma.juryScore.findMany({
      where: { juryUserId: session.user.id },
      select: { submissionId: true, criterionId: true },
    }),
  ]);

  const criteriaCountByProgram = new Map<string, number>();
  for (const c of criteria) {
    criteriaCountByProgram.set(
      c.programId,
      (criteriaCountByProgram.get(c.programId) ?? 0) + 1
    );
  }
  const myScoredBySubmission = new Map<string, number>();
  for (const s of myScores) {
    myScoredBySubmission.set(
      s.submissionId,
      (myScoredBySubmission.get(s.submissionId) ?? 0) + 1
    );
  }

  const programName = new Map(programs.map((p) => [p.id, p.name]));

  const entries = teams
    .filter((team) => team.submissions.length > 0)
    .map((team) => {
      const submission = team.submissions[0];
      const totalCriteria = criteriaCountByProgram.get(team.programId) ?? 0;
      const scored = myScoredBySubmission.get(submission.id) ?? 0;
      return {
        submissionId: submission.id,
        teamName: team.name,
        memberCount: team._count.members,
        programName: programName.get(team.programId) ?? "",
        title: submission.title,
        version: submission.version,
        submittedAt: submission.createdAt.toISOString(),
        totalCriteria,
        scoredCriteria: scored,
        done: totalCriteria > 0 && scored >= totalCriteria,
      };
    });

  return (
    <JuryDashboardClient
      locale={locale}
      userName={session.user.name ?? "Jury"}
      entries={entries}
    />
  );
}
