import { prisma } from "@/lib/prisma";

export interface CriterionBreakdown {
  criterionId: string;
  name: string;
  maxScore: number;
  weight: number;
  /** Average jury score for this criterion (raw, out of maxScore). */
  average: number | null;
  juryCount: number;
}

export interface TeamRanking {
  teamId: string;
  teamName: string;
  slogan: string | null;
  memberCount: number;
  submissionId: string | null;
  submissionTitle: string | null;
  submissionVersion: number | null;
  /** Weighted total normalized to 0–100. Null until at least one jury scores. */
  total: number | null;
  juryCount: number;
  rank: number;
  breakdown: CriterionBreakdown[];
}

/**
 * Computes the live leaderboard for a hackathon program.
 *
 * Each criterion's jury scores are averaged, normalized to 0–100 by its
 * maxScore, then combined as a weighted average. Teams without a scored
 * submission sort below scored teams, keeping their registration order.
 */
export async function computeRankings(programId: string): Promise<TeamRanking[]> {
  const [teams, criteria] = await Promise.all([
    prisma.hackathonTeam.findMany({
      where: { programId },
      orderBy: { createdAt: "asc" },
      include: {
        _count: { select: { members: true } },
        submissions: {
          orderBy: { version: "desc" },
          take: 1,
          include: { scores: true },
        },
      },
    }),
    prisma.juryCriterion.findMany({
      where: { programId },
      orderBy: { order: "asc" },
    }),
  ]);

  const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0) || 1;

  const rankings = teams.map((team) => {
    const submission = team.submissions[0] ?? null;
    const scores = submission?.scores ?? [];
    const juryIds = new Set(scores.map((s) => s.juryUserId));

    const breakdown: CriterionBreakdown[] = criteria.map((criterion) => {
      const criterionScores = scores.filter(
        (s) => s.criterionId === criterion.id
      );
      const average =
        criterionScores.length > 0
          ? criterionScores.reduce((sum, s) => sum + s.score, 0) /
            criterionScores.length
          : null;
      return {
        criterionId: criterion.id,
        name: criterion.name,
        maxScore: criterion.maxScore,
        weight: criterion.weight,
        average,
        juryCount: criterionScores.length,
      };
    });

    const scored = breakdown.filter((b) => b.average !== null);
    const total =
      scored.length > 0
        ? scored.reduce(
            (sum, b) => sum + ((b.average! / b.maxScore) * 100 * b.weight),
            0
          ) / totalWeight
        : null;

    return {
      teamId: team.id,
      teamName: team.name,
      slogan: team.slogan,
      memberCount: team._count.members,
      submissionId: submission?.id ?? null,
      submissionTitle: submission?.title ?? null,
      submissionVersion: submission?.version ?? null,
      total: total !== null ? Math.round(total * 10) / 10 : null,
      juryCount: juryIds.size,
      rank: 0,
      breakdown,
    };
  });

  rankings.sort((a, b) => {
    if (a.total === null && b.total === null) return 0;
    if (a.total === null) return 1;
    if (b.total === null) return -1;
    return b.total - a.total;
  });

  return rankings.map((r, i) => ({ ...r, rank: i + 1 }));
}
