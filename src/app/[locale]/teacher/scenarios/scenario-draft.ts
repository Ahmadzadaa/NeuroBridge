/**
 * The shape of a simulation scenario while it is being authored.
 *
 * Deliberately in its own module with no `"use client"` directive. These
 * factories used to live in `scenario-editor.tsx`, and the server component at
 * `new/page.tsx` imported `emptyScenario()` from there to build the blank
 * draft. Next.js allows a server component to *render* a client component, but
 * not to *call* a function exported from a client module — so that page threw
 * on every request:
 *
 *   Attempted to call emptyScenario() from the server but emptyScenario is on
 *   the client.
 *
 * There is no React or browser API in here, so both sides can import it.
 */

export interface ChoiceDraft {
  label: string;
  detail: string;
  cashDelta: number;
  satisfactionDelta: number;
  reputationDelta: number;
  variance: number;
  feedback: string;
}

export interface RoundDraft {
  title: string;
  context: string;
  choices: ChoiceDraft[];
}

export interface ScenarioDraft {
  name: string;
  description: string;
  startCash: number;
  targetCash: number;
  rounds: RoundDraft[];
}

export const emptyChoice = (): ChoiceDraft => ({
  label: "",
  detail: "",
  cashDelta: 0,
  satisfactionDelta: 0,
  reputationDelta: 0,
  variance: 0,
  feedback: "",
});

/** Two choices, because a round with one option is not a decision. */
export const emptyRound = (): RoundDraft => ({
  title: "",
  context: "",
  choices: [emptyChoice(), emptyChoice()],
});

export const emptyScenario = (): ScenarioDraft => ({
  name: "",
  description: "",
  startCash: 5000,
  targetCash: 20000,
  rounds: [emptyRound(), emptyRound(), emptyRound()],
});

export type ScenarioProblemKind =
  | "name"
  | "description"
  | "cash"
  | "rounds"
  | "title"
  | "context"
  | "choices"
  | "label"
  | "detail"
  | "feedback"
  | "numbers"
  | "chars";

/** Where a problem is: a round (1-based) and optionally a choice in it. */
export interface ScenarioProblem {
  kind: ScenarioProblemKind;
  round?: number;
  choice?: number;
}

const FORBIDDEN = /[<>]/;
const intIn = (v: number, min: number, max: number) => Number.isInteger(v) && v >= min && v <= max;

/**
 * The first thing the server would reject, mirroring `scenarioSchema`, so the
 * editor can say what to fix instead of failing on save with a generic error.
 */
export function scenarioProblem(draft: ScenarioDraft): ScenarioProblem | null {
  const text = (value: string, max: number, required = true) => {
    const v = value.trim();
    if (FORBIDDEN.test(v)) return "chars" as const;
    return (required && v.length === 0) || v.length > max ? "bad" : null;
  };
  const check = (value: string, max: number, kind: ScenarioProblemKind, at: Omit<ScenarioProblem, "kind"> = {}, required = true) => {
    const r = text(value, max, required);
    return r ? { kind: r === "chars" ? ("chars" as const) : kind, ...at } : null;
  };

  const name = draft.name.trim();
  if (name.length < 3) return { kind: "name" };
  const top = check(draft.name, 150, "name") ?? check(draft.description, 500, "description", {}, false);
  if (top) return top;
  if (!intIn(draft.startCash, 0, 1_000_000) || !intIn(draft.targetCash, 1, 10_000_000)) return { kind: "cash" };
  if (draft.rounds.length < 2 || draft.rounds.length > 15) return { kind: "rounds" };

  for (const [i, round] of draft.rounds.entries()) {
    const at = { round: i + 1 };
    const r = check(round.title, 150, "title", at) ?? check(round.context, 2000, "context", at);
    if (r) return r;
    if (round.choices.length < 2 || round.choices.length > 4) return { kind: "choices", ...at };
    for (const [j, c] of round.choices.entries()) {
      const where = { round: i + 1, choice: j + 1 };
      const p =
        check(c.label, 200, "label", where) ??
        check(c.detail, 300, "detail", where, false) ??
        check(c.feedback, 1000, "feedback", where);
      if (p) return p;
      if (
        !intIn(c.cashDelta, -1_000_000, 1_000_000) ||
        !intIn(c.satisfactionDelta, -100, 100) ||
        !intIn(c.reputationDelta, -100, 100) ||
        !intIn(c.variance, 0, 100_000)
      ) {
        return { kind: "numbers", ...where };
      }
    }
  }
  return null;
}
