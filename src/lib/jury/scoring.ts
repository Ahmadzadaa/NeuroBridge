/**
 * Pure calculations for the jury round — no database, so they are unit tested
 * directly.
 */

export type PlatformRow = { userId: string; points: number; testTotal: number };
export type RankedRow<T extends PlatformRow> = T & { rank: number };

/**
 * Orders students by unit points, then by the sum of their unit test scores.
 * Students level on both share a rank (1, 2, 2, 4), so a tie at the finalist
 * cut-off is visible rather than decided by sort order.
 */
export function rankByPlatformScore<T extends PlatformRow>(rows: T[]): RankedRow<T>[] {
  const sorted = [...rows].sort((a, b) => b.points - a.points || b.testTotal - a.testTotal);
  const ranked: RankedRow<T>[] = [];
  sorted.forEach((row, i) => {
    const prev = ranked[i - 1];
    const tie = prev && prev.points === row.points && prev.testTotal === row.testTotal;
    ranked.push({ ...row, rank: tie ? prev.rank : i + 1 });
  });
  return ranked;
}

export type CriterionDef = { id: string; maxScore: number; weight: number };
export type ScoreRow = { finalistId: string; criterionId: string; juryUserId: string; score: number };

export type FinalistResult = {
  finalistId: string;
  /** Average per criterion over the jurors who scored it; null when nobody has. */
  averages: Record<string, number | null>;
  /** Weighted, scale-normalised total out of 100, one decimal; null with no scores. */
  total: number | null;
  jurorsScored: number;
  rank: number | null;
};

/**
 * Averages each criterion over the current jurors, then combines criteria as
 * a weighted share of their maximum, so a 1–5 criterion and a 1–10 one count
 * by weight alone. Scores from jurors no longer on the panel are ignored.
 */
export function computeFinalistResults(input: {
  criteria: CriterionDef[];
  finalistIds: string[];
  jurorIds: string[];
  scores: ScoreRow[];
}): FinalistResult[] {
  const jurors = new Set(input.jurorIds);
  const totalWeight = input.criteria.reduce((n, c) => n + c.weight, 0);

  const results = input.finalistIds.map((finalistId) => {
    const mine = input.scores.filter((s) => s.finalistId === finalistId && jurors.has(s.juryUserId));
    const averages: Record<string, number | null> = {};
    let weighted = 0;
    let scoredWeight = 0;
    for (const c of input.criteria) {
      const values = mine.filter((s) => s.criterionId === c.id).map((s) => s.score);
      const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
      averages[c.id] = avg === null ? null : Math.round(avg * 100) / 100;
      if (avg !== null && c.maxScore > 0) {
        weighted += (avg / c.maxScore) * c.weight;
        scoredWeight += c.weight;
      }
    }
    const total = scoredWeight > 0 && totalWeight > 0 ? Math.round((weighted / totalWeight) * 1000) / 10 : null;
    return {
      finalistId,
      averages,
      total,
      jurorsScored: new Set(mine.map((s) => s.juryUserId)).size,
      rank: null as number | null,
    };
  });

  const ranked = results.filter((r) => r.total !== null).sort((a, b) => b.total! - a.total!);
  ranked.forEach((r, i) => {
    r.rank = i > 0 && ranked[i - 1].total === r.total ? ranked[i - 1].rank : i + 1;
  });
  return [...ranked, ...results.filter((r) => r.total === null)];
}

/** Validates one juror's sheet against the criteria; `complete` requires every criterion. */
export function validateScores(
  criteria: CriterionDef[],
  scores: Record<string, number>,
  complete: boolean
): { ok: true } | { ok: false; reason: "INVALID_SCORE" | "INCOMPLETE_EVALUATION" } {
  const byId = new Map(criteria.map((c) => [c.id, c]));
  for (const [criterionId, score] of Object.entries(scores)) {
    const c = byId.get(criterionId);
    if (!c || !Number.isInteger(score) || score < 0 || score > c.maxScore) return { ok: false, reason: "INVALID_SCORE" };
  }
  if (complete && criteria.some((c) => scores[c.id] === undefined)) return { ok: false, reason: "INCOMPLETE_EVALUATION" };
  return { ok: true };
}
