import { describe, expect, it } from "vitest";
import {
  AssessmentAnswerError,
  bandOf,
  developmentAreas,
  localized,
  scoreAssessment,
} from "@/lib/assessments/scoring";

const scale = { scaleMin: 1, scaleMax: 5 };
const questions = [
  { id: "q1", dimensionCode: "CURIOSITY", reverse: false },
  { id: "q2", dimensionCode: "CURIOSITY", reverse: false },
  { id: "q3", dimensionCode: "STRESS", reverse: true },
];

function expectAnswerError(fn: () => unknown, code: string) {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(AssessmentAnswerError);
    expect((error as AssessmentAnswerError).code).toBe(code);
    return;
  }
  throw new Error(`Expected ${code}`);
}

describe("scoreAssessment", () => {
  it("maps the scale to 0-100 and averages per dimension", () => {
    expect(scoreAssessment(scale, questions, { q1: 5, q2: 5, q3: 1 })).toEqual({ CURIOSITY: 100, STRESS: 100 });
    expect(scoreAssessment(scale, questions, { q1: 1, q2: 1, q3: 5 })).toEqual({ CURIOSITY: 0, STRESS: 0 });
    expect(scoreAssessment(scale, questions, { q1: 3, q2: 4, q3: 3 })).toEqual({ CURIOSITY: 63, STRESS: 50 });
  });

  it("flips reverse-keyed items", () => {
    expect(scoreAssessment(scale, questions, { q1: 3, q2: 3, q3: 2 }).STRESS).toBe(75);
  });

  it("rejects missing, out-of-scale, fractional and unknown answers", () => {
    expectAnswerError(() => scoreAssessment(scale, questions, { q1: 3, q2: 3 }), "MISSING_ANSWER");
    expectAnswerError(() => scoreAssessment(scale, questions, { q1: 6, q2: 3, q3: 3 }), "OUT_OF_SCALE");
    expectAnswerError(() => scoreAssessment(scale, questions, { q1: 2.5, q2: 3, q3: 3 }), "OUT_OF_SCALE");
    expectAnswerError(() => scoreAssessment(scale, questions, { q1: 3, q2: 3, q3: 3, qX: 1 }), "UNKNOWN_QUESTION");
  });
});

describe("helpers", () => {
  it("bands scores at 40 and 70", () => {
    expect([0, 39, 40, 69, 70, 100].map(bandOf)).toEqual(["low", "low", "mid", "mid", "high", "high"]);
  });

  it("returns the lowest dimensions as development areas", () => {
    const dims = [{ code: "A", score: 80 }, { code: "B", score: 20 }, { code: "C", score: 55 }];
    expect(developmentAreas(dims).map((d) => d.code)).toEqual(["B", "C"]);
  });

  it("picks the locale and falls back to Turkish", () => {
    const json = JSON.stringify({ tr: "Merak", en: "Curiosity" });
    expect(localized(json, "en")).toBe("Curiosity");
    expect(localized(json, "az")).toBe("Merak");
    expect(localized("plain text", "en")).toBe("plain text");
  });
});
