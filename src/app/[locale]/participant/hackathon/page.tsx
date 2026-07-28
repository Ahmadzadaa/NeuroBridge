import { setRequestLocale } from "next-intl/server";
import { requireRole } from "@/lib/auth-utils";
import { requireFeature } from "@/lib/tenant/require-feature";
import { prisma } from "@/lib/prisma";
import { computeRankings } from "@/lib/hackathon/ranking";
import { resultsVisible } from "@/lib/hackathon/reveal";
import { HackathonClient } from "./hackathon-client";

export default async function ParticipantHackathonPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireRole(locale, ["PARTICIPANT"]);
  await requireFeature(session.user.tenantId, "hackathon");

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { coinBalance: true },
  });

  // Latest hackathon in the participant's tenant they can take part in.
  const program = await prisma.program.findFirst({
    where: {
      type: "hackathon",
      ...(session.user.tenantId ? { tenantId: session.user.tenantId } : {}),
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      description: true,
      simulationEnd: true,
      resultsRevealAt: true,
    },
  });

  if (!program) {
    return (
      <HackathonClient
        locale={locale}
        userName={session.user.name ?? "Participant"}
        coinBalance={me?.coinBalance ?? 0}
        program={null}
        myTeam={null}
        teams={[]}
        rankings={[]}
        criteria={[]}
        resultsRevealAt={null}
        resultsAreVisible={true}
        feedback={[]}
      />
    );
  }

  const visible = resultsVisible(program.resultsRevealAt);

  const [teams, membership, rankings, criteria] = await Promise.all([
    prisma.hackathonTeam.findMany({
      where: { programId: program.id },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        slogan: true,
        _count: { select: { members: true } },
      },
    }),
    prisma.teamMember.findFirst({
      where: { userId: session.user.id, team: { programId: program.id } },
      include: {
        team: {
          include: {
            members: {
              include: {
                user: { select: { firstName: true, lastName: true, email: true } },
              },
              orderBy: { joinedAt: "asc" },
            },
            submissions: { orderBy: { version: "desc" } },
          },
        },
      },
    }),
    // Rankings stay server-side until the reveal moment.
    visible ? computeRankings(program.id) : Promise.resolve([]),
    prisma.juryCriterion.findMany({
      where: { programId: program.id },
      orderBy: { order: "asc" },
      select: { id: true, name: true, maxScore: true, weight: true },
    }),
  ]);

  // Jury feedback for my team's latest submission — only after reveal.
  const latestSubmissionId = membership?.team.submissions[0]?.id ?? null;
  const feedback =
    visible && latestSubmissionId
      ? await prisma.juryScore
          .findMany({
            where: { submissionId: latestSubmissionId },
            include: { criterion: { select: { id: true, name: true, maxScore: true, order: true } } },
            orderBy: [{ criterion: { order: "asc" } }, { createdAt: "asc" }],
          })
          .then((scores) => {
            const juryOrder: string[] = [];
            for (const s of scores) {
              if (!juryOrder.includes(s.juryUserId)) juryOrder.push(s.juryUserId);
            }
            const byCriterion = new Map<
              string,
              {
                criterionId: string;
                name: string;
                maxScore: number;
                entries: { juryLabel: number; score: number; comment: string | null }[];
              }
            >();
            for (const s of scores) {
              const bucket = byCriterion.get(s.criterion.id) ?? {
                criterionId: s.criterion.id,
                name: s.criterion.name,
                maxScore: s.criterion.maxScore,
                entries: [],
              };
              bucket.entries.push({
                juryLabel: juryOrder.indexOf(s.juryUserId) + 1,
                score: s.score,
                comment: s.comment,
              });
              byCriterion.set(s.criterion.id, bucket);
            }
            return [...byCriterion.values()];
          })
      : [];

  return (
    <HackathonClient
      locale={locale}
      userName={session.user.name ?? "Participant"}
      coinBalance={me?.coinBalance ?? 0}
      program={{
        id: program.id,
        name: program.name,
        description: program.description,
        deadline: program.simulationEnd?.toISOString() ?? null,
      }}
      myTeam={
        membership
          ? {
              id: membership.team.id,
              name: membership.team.name,
              slogan: membership.team.slogan,
              isLeader: membership.isLeader,
              members: membership.team.members.map((m) => ({
                name:
                  [m.user.firstName, m.user.lastName].filter(Boolean).join(" ") ||
                  m.user.email,
                isLeader: m.isLeader,
              })),
              submissions: membership.team.submissions.map((s) => ({
                id: s.id,
                title: s.title,
                version: s.version,
                fileName: s.fileName,
                createdAt: s.createdAt.toISOString(),
              })),
            }
          : null
      }
      teams={teams.map((t) => ({
        id: t.id,
        name: t.name,
        slogan: t.slogan,
        memberCount: t._count.members,
      }))}
      rankings={rankings}
      criteria={criteria}
      resultsRevealAt={program.resultsRevealAt?.toISOString() ?? null}
      resultsAreVisible={visible}
      feedback={feedback}
    />
  );
}
