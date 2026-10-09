import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    hackathonTeam: { findMany: vi.fn() },
    juryCriterion: { findMany: vi.fn() },
  },
}));

import { prisma } from "@/lib/prisma";
import { computeRankings } from "@/lib/hackathon/ranking";

const CRITERIA = [
  { id: "c1", programId: "p1", name: "Innovation", maxScore: 10, weight: 30, order: 1 },
  { id: "c2", programId: "p1", name: "Execution", maxScore: 10, weight: 25, order: 2 },
  { id: "c3", programId: "p1", name: "Market", maxScore: 10, weight: 25, order: 3 },
  { id: "c4", programId: "p1", name: "Pitch", maxScore: 10, weight: 20, order: 4 },
];

function team(id: string, scores: Array<{ criterionId: string; juryUserId: string; score: number }>) {
  return {
    id,
    name: `Team ${id}`,
    slogan: null,
    createdAt: new Date("2026-01-01"),
    _count: { members: 3 },
    submissions: scores.length
      ? [{ id: `s-${id}`, title: `Project ${id}`, version: 1, scores }]
      : [],
  };
}

function setup(teams: ReturnType<typeof team>[], criteria = CRITERIA) {
  vi.mocked(prisma.hackathonTeam.findMany).mockResolvedValue(teams as never);
  vi.mocked(prisma.juryCriterion.findMany).mockResolvedValue(criteria as never);
}

describe("computeRankings", () => {
  beforeEach(() => vi.clearAllMocks());

  it("scores a fully judged team out of 100", async () => {
    setup([
      team("a", CRITERIA.map((c) => ({ criterionId: c.id, juryUserId: "j1", score: 10 }))),
    ]);
    const [first] = await computeRankings("p1");
    expect(first.total).toBe(100);
    expect(first.juryCount).toBe(1);
  });

  it("averages several juries per criterion", async () => {
    setup([
      team("a", [
        { criterionId: "c1", juryUserId: "j1", score: 10 },
        { criterionId: "c1", juryUserId: "j2", score: 6 },
        { criterionId: "c2", juryUserId: "j1", score: 8 },
        { criterionId: "c3", juryUserId: "j1", score: 8 },
        { criterionId: "c4", juryUserId: "j1", score: 8 },
      ]),
    ]);
    const [first] = await computeRankings("p1");
    // c1 averages 8/10 → every criterion sits at 80 → weighted total is 80.
    expect(first.total).toBe(80);
    expect(first.juryCount).toBe(2);
    expect(first.breakdown[0].average).toBe(8);
  });

  it("normalises over the judged weight only, not the full weight", async () => {
    // Only Innovation (weight 30 of 100) has been scored, at full marks.
    setup([team("a", [{ criterionId: "c1", juryUserId: "j1", score: 10 }])]);
    const [first] = await computeRankings("p1");
    // Dividing by the full weight would report 30 and make a perfect score look
    // like a failing one while the panel is still working.
    expect(first.total).toBe(100);
  });

  it("does not rank a partly judged team below an equally scoring full one", async () => {
    setup([
      team("full", CRITERIA.map((c) => ({ criterionId: c.id, juryUserId: "j1", score: 7 }))),
      team("partial", [{ criterionId: "c1", juryUserId: "j1", score: 7 }]),
    ]);
    const ranked = await computeRankings("p1");
    expect(ranked[0].total).toBe(ranked[1].total);
  });

  it("leaves unscored teams with a null total and sorts them last", async () => {
    setup([
      team("unscored", []),
      team("scored", [{ criterionId: "c1", juryUserId: "j1", score: 5 }]),
    ]);
    const ranked = await computeRankings("p1");
    expect(ranked[0].teamId).toBe("scored");
    expect(ranked[1].total).toBeNull();
    expect(ranked[1].rank).toBe(2);
  });

  it("survives a criteria set whose weights are all zero", async () => {
    const zeroWeighted = CRITERIA.map((c) => ({ ...c, weight: 0 }));
    setup([team("a", [{ criterionId: "c1", juryUserId: "j1", score: 10 }])], zeroWeighted);
    const [first] = await computeRankings("p1");
    expect(first.total).toBeNull();
  });
});
