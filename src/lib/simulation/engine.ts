/**
 * Data-driven scenario simulation engine.
 *
 * A scenario is pure data: SimulationRound rows (context + order) each with
 * SimulationChoice rows (metric deltas + variance + feedback). The engine
 * only reads that structure and advances state — adding a new scenario means
 * writing rows, never code.
 *
 * State per run: cash (unbounded), satisfaction and reputation (0–100).
 * Final score (0–100) = 40% cash progress toward the scenario's targetCash
 * + 30% satisfaction + 30% reputation.
 */

export const START_SATISFACTION = 50;
export const START_REPUTATION = 50;
export const SIMULATION_PASS_COIN_REWARD = 50;
export const SIMULATION_PASS_SCORE = 70;

export interface MetricState {
  cash: number;
  satisfaction: number;
  reputation: number;
}

export interface ChoiceEffect {
  cashDelta: number;
  satisfactionDelta: number;
  reputationDelta: number;
  variance: number;
}

export function clampMetric(value: number): number {
  return Math.max(0, Math.min(100, value));
}

/**
 * Applies a choice to the current state. Variance adds market noise to the
 * cash outcome only (±variance, uniform), so identical strategies still
 * produce slightly different runs.
 */
export function applyChoice(
  state: MetricState,
  effect: ChoiceEffect,
  random: () => number = Math.random
): MetricState {
  const noise =
    effect.variance > 0
      ? Math.round((random() * 2 - 1) * effect.variance)
      : 0;

  return {
    cash: state.cash + effect.cashDelta + noise,
    satisfaction: clampMetric(state.satisfaction + effect.satisfactionDelta),
    reputation: clampMetric(state.reputation + effect.reputationDelta),
  };
}

/** Cash progress toward target, clamped 0–100. Negative cash scores 0. */
export function cashScore(cash: number, targetCash: number): number {
  if (targetCash <= 0) return 0;
  return clampMetric(Math.round((cash / targetCash) * 100));
}

export function computeScore(state: MetricState, targetCash: number): number {
  return Math.round(
    cashScore(state.cash, targetCash) * 0.4 +
      state.satisfaction * 0.3 +
      state.reputation * 0.3
  );
}
