import { describe, expect, it } from "vitest";
import { computeFinalistResults, rankByPlatformScore, validateScores } from "@/lib/jury/scoring";

describe("rankByPlatformScore", () => {
  it("orders by points, then test total, and shares ranks on a full tie", () => {
    const ranked = rankByPlatformScore([
      { userId: "a", points: 300, testTotal: 250 },
      { userId: "b", points: 500, testTotal: 400 },
      { userId: "c", points: 300, testTotal: 250 },
      { userId: "d", points: 300, testTotal: 260 },
      { userId: "e", points: 0, testTotal: 0 },
    ]);
    expect(ranked.map((r) => [r.userId, r.rank])).toEqual([
      ["b", 1],
      ["d", 2],
      ["a", 3],
      ["c", 3],
      ["e", 5],
    ]);
  });
});

describe("computeFinalistResults", () => {
  const criteria = [
    { id: "problem", maxScore: 10, weight: 1 },
    { id: "pitch", maxScore: 5, weight: 2 },
  ];

  it("averages jurors per criterion and weights by share of each scale", () => {
    const [r] = computeFinalistResults({
      criteria,
      finalistIds: ["f1"],
      jurorIds: ["j1", "j2"],
      scores: [
        { finalistId: "f1", criterionId: "problem", juryUserId: "j1", score: 8 },
        { finalistId: "f1", criterionId: "problem", juryUserId: "j2", score: 6 },
        { finalistId: "f1", criterionId: "pitch", juryUserId: "j1", score: 5 },
        { finalistId: "f1", criterionId: "pitch", juryUserId: "j2", score: 4 },
      ],
    });
    expect(r.averages).toEqual({ problem: 7, pitch: 4.5 });
    // (0.7 * 1 + 0.9 * 2) / 3 = 0.8333 → 83.3
    expect(r.total).toBe(83.3);
    expect(r.jurorsScored).toBe(2);
    expect(r.rank).toBe(1);
  });

  it("ignores jurors no longer on the panel and ranks unscored finalists last", () => {
    const results = computeFinalistResults({
      criteria,
      finalistIds: ["f1", "f2", "f3"],
      jurorIds: ["j1"],
      scores: [
        { finalistId: "f1", criterionId: "problem", juryUserId: "j1", score: 5 },
        { finalistId: "f1", criterionId: "pitch", juryUserId: "j1", score: 5 },
        { finalistId: "f2", criterionId: "problem", juryUserId: "j1", score: 10 },
        { finalistId: "f2", criterionId: "pitch", juryUserId: "j1", score: 5 },
        { finalistId: "f3", criterionId: "problem", juryUserId: "removed", score: 10 },
      ],
    });
    expect(results.map((r) => [r.finalistId, r.rank])).toEqual([
      ["f2", 1],
      ["f1", 2],
      ["f3", null],
    ]);
    expect(results[2].total).toBeNull();
  });
});

describe("validateScores", () => {
  const criteria = [
    { id: "a", maxScore: 10, weight: 1 },
    { id: "b", maxScore: 10, weight: 1 },
  ];

  it("accepts a partial draft but not a partial submission", () => {
    expect(validateScores(criteria, { a: 7 }, false)).toEqual({ ok: true });
    expect(validateScores(criteria, { a: 7 }, true)).toEqual({ ok: false, reason: "INCOMPLETE_EVALUATION" });
  });

  it("rejects out-of-scale, fractional and unknown-criterion scores", () => {
    expect(validateScores(criteria, { a: 11 }, false)).toEqual({ ok: false, reason: "INVALID_SCORE" });
    expect(validateScores(criteria, { a: 7.5 }, false)).toEqual({ ok: false, reason: "INVALID_SCORE" });
    expect(validateScores(criteria, { z: 3 }, false)).toEqual({ ok: false, reason: "INVALID_SCORE" });
  });
});
