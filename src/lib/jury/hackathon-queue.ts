import { prisma } from "@/lib/prisma";
import { hasFeature } from "@/lib/tenant/features";

export type HackathonEntryStatus = "DONE" | "PARTIAL" | "TODO";

export interface HackathonEntry {
  submissionId: string;
  title: string;
  version: number;
  teamName: string;
  members: { userId: string; name: string; hasAvatar: boolean }[];
  scored: number;
  total: number;
  status: HackathonEntryStatus;
}

export interface HackathonQueueProgram {
  programId: string;
  programName: string;
  entries: HackathonEntry[];
}

const fullName = (u: { firstName: string | null; lastName: string | null; email: string }) =>
  [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email;

/**
 * The latest submission of every hackathon team in the juror's organisation,
 * with how many criteria this juror has scored. Empty when hackathons are off.
 */
export async function getHackathonQueue(tenantId: string | null, juryUserId: string): Promise<HackathonQueueProgram[]> {
  if (!(await hasFeature(tenantId, "hackathon"))) return [];
  const programs = await prisma.program.findMany({
    where: { type: "hackathon", ...(tenantId ? { tenantId } : {}) },
    select: { id: true, name: true },
    orderBy: { createdAt: "desc" },
  });
  const programIds = programs.map((p) => p.id);
  const [teams, criteria, myScores] = await Promise.all([
    prisma.hackathonTeam.findMany({
      where: { programId: { in: programIds }, submissions: { some: {} } },
      include: {
        submissions: { orderBy: { version: "desc" }, take: 1, select: { id: true, title: true, version: true } },
        members: { include: { user: { select: { id: true, firstName: true, lastName: true, email: true, avatarPath: true } } } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.juryCriterion.groupBy({ by: ["programId"], where: { programId: { in: programIds } }, _count: true }),
    prisma.juryScore.groupBy({ by: ["submissionId"], where: { juryUserId }, _count: true }),
  ]);
  const criteriaCount = new Map(criteria.map((c) => [c.programId, c._count]));
  const scoredCount = new Map(myScores.map((s) => [s.submissionId, s._count]));

  return programs
    .map((program) => ({
      programId: program.id,
      programName: program.name,
      entries: teams
        .filter((team) => team.programId === program.id)
        .map((team): HackathonEntry => {
          const submission = team.submissions[0];
          const total = criteriaCount.get(program.id) ?? 0;
          const scored = Math.min(scoredCount.get(submission.id) ?? 0, total);
          return {
            submissionId: submission.id,
            title: submission.title,
            version: submission.version,
            teamName: team.name,
            members: team.members.map((m) => ({ userId: m.user.id, name: fullName(m.user), hasAvatar: Boolean(m.user.avatarPath) })),
            scored,
            total,
            status: total > 0 && scored >= total ? "DONE" : scored > 0 ? "PARTIAL" : "TODO",
          };
        }),
    }))
    .filter((program) => program.entries.length > 0);
}
