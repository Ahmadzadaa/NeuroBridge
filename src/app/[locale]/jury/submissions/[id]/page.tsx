import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth-utils";
import { requireFeature } from "@/lib/tenant/require-feature";
import { prisma } from "@/lib/prisma";
import { criterionLabel } from "@/lib/jury/criteria";
import { getHackathonQueue } from "@/lib/jury/hackathon-queue";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { ScoreSubmissionClient } from "./score-client";

type Params = { params: Promise<{ locale: string; id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "hackathon.jury" });
  return { title: `${t("scoringHeading")} · BizSim` };
}

/** A hackathon team's latest submission next to the juror's scoring sheet. */
export default async function ScoreSubmissionPage({ params }: Params) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const session = await requireRole(locale, ["JURY"]);
  await requireFeature(session.user.tenantId, "hackathon");
  const t = await getTranslations("hackathon.jury");

  const submission = await prisma.projectSubmission.findUnique({
    where: { id },
    include: {
      team: {
        include: {
          program: { select: { id: true, name: true, tenantId: true } },
          members: { include: { user: { select: { id: true, firstName: true, lastName: true, email: true, avatarPath: true } } } },
        },
      },
    },
  });
  if (!submission || (session.user.tenantId && submission.team.program.tenantId !== session.user.tenantId)) {
    notFound();
  }

  const [criteria, myScores, queue] = await Promise.all([
    prisma.juryCriterion.findMany({ where: { programId: submission.team.program.id }, orderBy: { order: "asc" } }),
    prisma.juryScore.findMany({ where: { submissionId: id, juryUserId: session.user.id } }),
    getHackathonQueue(session.user.tenantId ?? null, session.user.id),
  ]);

  // Prev / next within the same hackathon, and the next one still waiting for this juror.
  const entries = queue.find((p) => p.programId === submission.team.program.id)?.entries ?? [];
  const index = entries.findIndex((e) => e.submissionId === id);
  const after = [...entries.slice(index + 1), ...entries.slice(0, Math.max(index, 0))];

  return (
    <DashboardLayout panel="jury" title={t("scoringHeading")} userName={session.user.name ?? ""}>
      <ScoreSubmissionClient
        submission={{
          id: submission.id,
          title: submission.title,
          summary: submission.summary,
          fileName: submission.fileName,
          version: submission.version,
          teamName: submission.team.name,
          slogan: submission.team.slogan,
          programName: submission.team.program.name,
          members: submission.team.members.map((m) => ({
            userId: m.user.id,
            name: [m.user.firstName, m.user.lastName].filter(Boolean).join(" ") || m.user.email,
            hasAvatar: Boolean(m.user.avatarPath),
          })),
        }}
        criteria={criteria.map((c) => ({ id: c.id, label: criterionLabel(c, locale), maxScore: c.maxScore, weight: c.weight }))}
        initialScores={Object.fromEntries(myScores.map((s) => [s.criterionId, s.score]))}
        initialComments={Object.fromEntries(myScores.filter((s) => s.comment).map((s) => [s.criterionId, s.comment ?? ""]))}
        nav={{
          position: index + 1,
          total: entries.length,
          prevId: index > 0 ? entries[index - 1].submissionId : null,
          nextId: index >= 0 && index < entries.length - 1 ? entries[index + 1].submissionId : null,
          nextPendingId: after.find((e) => e.status !== "DONE")?.submissionId ?? null,
        }}
      />
    </DashboardLayout>
  );
}
