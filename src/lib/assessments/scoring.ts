/**
 * Likert scoring for the baseline assessments. Pure, so the rules are easy
 * to test and to keep stable when real instruments replace the demo ones.
 */

export type ScoringQuestion = { id: string; dimensionCode: string; reverse: boolean };
export type ScoringScale = { scaleMin: number; scaleMax: number };
export type DimensionScores = Record<string, number>;
export type Band = "low" | "mid" | "high";

export class AssessmentAnswerError extends Error {
  readonly statusCode = 400;
  constructor(public readonly code: "MISSING_ANSWER" | "OUT_OF_SCALE" | "UNKNOWN_QUESTION") {
    super(`Assessment answers: ${code}`);
    this.name = "AssessmentAnswerError";
  }
}

/**
 * Each dimension's mean answer mapped to 0-100 (scaleMin -> 0, scaleMax ->
 * 100), with reverse-keyed items flipped first. Every question must be
 * answered with a whole number on the scale.
 */
export function scoreAssessment(
  scale: ScoringScale,
  questions: ScoringQuestion[],
  answers: Record<string, number>
): DimensionScores {
  const known = new Set(questions.map((q) => q.id));
  if (Object.keys(answers).some((id) => !known.has(id))) {
    throw new AssessmentAnswerError("UNKNOWN_QUESTION");
  }

  const sums = new Map<string, { total: number; count: number }>();
  for (const q of questions) {
    const raw = answers[q.id];
    if (raw === undefined || raw === null) throw new AssessmentAnswerError("MISSING_ANSWER");
    if (!Number.isInteger(raw) || raw < scale.scaleMin || raw > scale.scaleMax) {
      throw new AssessmentAnswerError("OUT_OF_SCALE");
    }
    const value = q.reverse ? scale.scaleMin + scale.scaleMax - raw : raw;
    const acc = sums.get(q.dimensionCode) ?? { total: 0, count: 0 };
    sums.set(q.dimensionCode, { total: acc.total + value, count: acc.count + 1 });
  }

  const span = scale.scaleMax - scale.scaleMin;
  return Object.fromEntries(
    [...sums].map(([code, { total, count }]) => [
      code,
      Math.round(((total / count - scale.scaleMin) / span) * 100),
    ])
  );
}

export function bandOf(score: number): Band {
  if (score < 40) return "low";
  if (score < 70) return "mid";
  return "high";
}

/** Lowest-scoring dimensions first: the student's development areas. */
export function developmentAreas<T extends { score: number }>(dimensions: T[], count = 2): T[] {
  return [...dimensions].sort((a, b) => a.score - b.score).slice(0, count);
}

/** Picks a locale from a {"tr": …, "en": …, "az": …} JSON column. */
export function localized(json: string | null | undefined, locale: string): string {
  if (!json) return "";
  try {
    const map = JSON.parse(json) as Record<string, string>;
    return map[locale] ?? map.tr ?? map.en ?? Object.values(map)[0] ?? "";
  } catch {
    return json;
  }
}
