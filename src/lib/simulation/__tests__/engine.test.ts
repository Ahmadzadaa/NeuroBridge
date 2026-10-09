import { describe, expect, it } from "vitest";
import {
  applyChoice,
  cashScore,
  clampMetric,
  computeScore,
} from "@/lib/simulation/engine";

describe("simulation engine", () => {
  const base = { cash: 1000, satisfaction: 50, reputation: 50 };

  it("applies deltas without variance deterministically", () => {
    const next = applyChoice(base, {
      cashDelta: 300,
      satisfactionDelta: 10,
      reputationDelta: -5,
      variance: 0,
    });
    expect(next).toEqual({ cash: 1300, satisfaction: 60, reputation: 45 });
  });

  it("clamps satisfaction and reputation to 0–100", () => {
    const next = applyChoice(
      { cash: 0, satisfaction: 95, reputation: 3 },
      { cashDelta: 0, satisfactionDelta: 20, reputationDelta: -10, variance: 0 }
    );
    expect(next.satisfaction).toBe(100);
    expect(next.reputation).toBe(0);
  });

  it("keeps cash noise within ±variance", () => {
    // random() = 1 → maximum positive noise; random() = 0 → maximum negative.
    const high = applyChoice(base, {
      cashDelta: 0,
      satisfactionDelta: 0,
      reputationDelta: 0,
      variance: 200,
    }, () => 1);
    const low = applyChoice(base, {
      cashDelta: 0,
      satisfactionDelta: 0,
      reputationDelta: 0,
      variance: 200,
    }, () => 0);
    expect(high.cash).toBe(1200);
    expect(low.cash).toBe(800);
  });

  it("scores cash progress against the target", () => {
    expect(cashScore(3000, 3000)).toBe(100);
    expect(cashScore(1500, 3000)).toBe(50);
    expect(cashScore(-500, 3000)).toBe(0);
    expect(cashScore(9000, 3000)).toBe(100);
  });

  it("weights final score 40/30/30", () => {
    expect(
      computeScore({ cash: 3000, satisfaction: 100, reputation: 100 }, 3000)
    ).toBe(100);
    expect(
      computeScore({ cash: 1500, satisfaction: 60, reputation: 40 }, 3000)
    ).toBe(50);
    expect(computeScore({ cash: 0, satisfaction: 0, reputation: 0 }, 3000)).toBe(0);
  });

  it("clampMetric bounds values", () => {
    expect(clampMetric(-5)).toBe(0);
    expect(clampMetric(105)).toBe(100);
    expect(clampMetric(42)).toBe(42);
  });
});
