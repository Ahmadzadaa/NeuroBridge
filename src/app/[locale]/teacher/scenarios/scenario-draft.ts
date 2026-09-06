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
