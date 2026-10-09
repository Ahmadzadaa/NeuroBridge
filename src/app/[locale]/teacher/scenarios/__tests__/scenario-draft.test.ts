import { describe, expect, it } from "vitest";
import { emptyChoice, emptyScenario, scenarioProblem, type ScenarioDraft } from "../scenario-draft";
import { scenarioSchema } from "@/lib/validation/schemas";

function complete(): ScenarioDraft {
  const draft = emptyScenario();
  draft.name = "Coffee shop";
  draft.rounds = draft.rounds.slice(0, 2).map((round, i) => ({
    title: `Round ${i + 1}`,
    context: "What do you do?",
    choices: round.choices.map((_, j) => ({ ...emptyChoice(), label: `Option ${j + 1}`, feedback: "It worked." })),
  }));
  return draft;
}

/** What the editor sends: empty optional text is omitted. */
const payload = (d: ScenarioDraft) => ({
  ...d,
  description: d.description.trim() || undefined,
  rounds: d.rounds.map((r) => ({ ...r, choices: r.choices.map((c) => ({ ...c, detail: c.detail.trim() || undefined })) })),
});

describe("scenarioProblem", () => {
  it("accepts exactly what the server accepts", () => {
    expect(scenarioProblem(complete())).toBeNull();
    expect(scenarioSchema.safeParse(payload(complete())).success).toBe(true);
  });

  it.each([
    ["a fractional cash delta", (d: ScenarioDraft) => (d.rounds[1].choices[0].cashDelta = 12.5), { kind: "numbers", round: 2, choice: 1 }],
    ["satisfaction over 100", (d: ScenarioDraft) => (d.rounds[0].choices[1].satisfactionDelta = 150), { kind: "numbers", round: 1, choice: 2 }],
    ["angle brackets", (d: ScenarioDraft) => (d.rounds[0].context = "<b>hi</b>"), { kind: "chars", round: 1 }],
    ["a missing outcome", (d: ScenarioDraft) => (d.rounds[1].choices[1].feedback = "  "), { kind: "feedback", round: 2, choice: 2 }],
    ["a target over the limit", (d: ScenarioDraft) => (d.targetCash = 20_000_000), { kind: "cash" }],
  ])("points at %s, which the server rejects", (_, mutate, expected) => {
    const draft = complete();
    mutate(draft);
    expect(scenarioProblem(draft)).toEqual(expected);
    expect(scenarioSchema.safeParse(payload(draft)).success).toBe(false);
  });
});
