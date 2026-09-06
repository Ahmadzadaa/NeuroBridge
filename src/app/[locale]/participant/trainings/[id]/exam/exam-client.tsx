"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { motion, useReducedMotion } from "framer-motion";
import confetti from "canvas-confetti";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileQuestion,
  Loader2,
  RotateCcw,
  Trophy,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

type OptionKey = "A" | "B" | "C" | "D";

interface ExamQuestion {
  id: string;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
}

interface QuestionResult {
  questionId: string;
  yourAnswer: OptionKey | null;
  correctOption: OptionKey;
  correct: boolean;
  explanation: string;
}

interface ExamResult {
  score: number;
  passed: boolean;
  passingThreshold: number;
  correctCount: number;
  totalQuestions: number;
  coinsAwarded: number;
  bestScore: number;
  results: QuestionResult[];
}

interface ExamClientProps {
  locale: string;
  userName: string;
  coinBalance: number;
  trainingId: string;
  examId: string;
  examTitle: string;
  passingThreshold: number;
  previousAttempt: { score: number; passed: boolean } | null;
  questions: ExamQuestion[];
}

const OPTION_KEYS: OptionKey[] = ["A", "B", "C", "D"];

export function ExamClient({
  locale,
  userName,
  coinBalance,
  trainingId,
  examId,
  examTitle,
  passingThreshold,
  previousAttempt,
  questions,
}: ExamClientProps) {
  const t = useTranslations("participant.exam");
  const router = useRouter();
  const reducedMotion = useReducedMotion();

  const [phase, setPhase] = useState<"intro" | "quiz" | "result">("intro");
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, OptionKey>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ExamResult | null>(null);

  const question = questions[current];
  const answeredCount = Object.keys(answers).length;
  const allAnswered = answeredCount === questions.length;
  const backHref = `/${locale}/participant/trainings/${trainingId}`;

  function selectOption(option: OptionKey) {
    setAnswers((prev) => ({ ...prev, [question.id]: option }));
  }

  async function submit() {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/exams/${examId}/attempt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = (await res.json()) as ExamResult;
      setResult(data);
      setPhase("result");
      router.refresh();
      if (data.passed && !reducedMotion) {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.3 },
          disableForReducedMotion: true,
        });
      }
    } catch {
      toast.error(t("submitError"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DashboardLayout
      panel="participant"
      title={examTitle}
      userName={userName}
      coinBalance={coinBalance}
    >
      <Link
        href={backHref}
        className="mb-5 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        {t("backToTraining")}
      </Link>

      <div className="mx-auto max-w-3xl">
          {/* ── Intro ─────────────────────────────────────────── */}
          {phase === "intro" && (
            <motion.div
              key="intro"
              initial={reducedMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: [0, 0, 0.2, 1] }}
              className="rounded-2xl bg-card p-8 text-center shadow-sm"
            >
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <FileQuestion className="h-8 w-8" aria-hidden="true" />
              </div>
              <h2 className="mt-5 text-[20px] font-semibold">{examTitle}</h2>
              <p className="mx-auto mt-2 max-w-md text-[14px] text-muted-foreground">
                {t("introText", {
                  count: questions.length,
                  threshold: passingThreshold,
                })}
              </p>

              {previousAttempt && (
                <div
                  className={cn(
                    "mx-auto mt-5 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[13px] font-semibold",
                    previousAttempt.passed
                      ? "bg-success/10 text-success"
                      : "bg-warning/10 text-warning-dark"
                  )}
                >
                  {previousAttempt.passed ? (
                    <Trophy className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  )}
                  {t("previousBest", { score: previousAttempt.score })}
                </div>
              )}

              <Button
                size="lg"
                className="mt-7 min-w-[200px] rounded-xl"
                onClick={() => setPhase("quiz")}
              >
                {previousAttempt ? t("retake") : t("begin")}
              </Button>
            </motion.div>
          )}

          {/* ── Quiz ──────────────────────────────────────────── */}
          {phase === "quiz" && question && (
            <motion.div
              key="quiz"
              initial={reducedMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: [0, 0, 0.2, 1] }}
            >
              <div className="mb-4 flex items-center gap-4">
                <Progress
                  value={(answeredCount / questions.length) * 100}
                  className="h-1.5 flex-1"
                />
                <span className="text-[13px] font-semibold tabular-nums text-muted-foreground">
                  {current + 1} / {questions.length}
                </span>
              </div>

                      <motion.div
                  key={question.id}
                  initial={reducedMotion ? false : { opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.22, ease: [0, 0, 0.2, 1] }}
                  className="rounded-2xl bg-card p-6 shadow-sm sm:p-8"
                >
                  <p className="text-[12px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">
                    {t("questionLabel", { number: current + 1 })}
                  </p>
                  <h2 className="mt-2 text-[17px] font-semibold leading-relaxed">
                    {question.questionText}
                  </h2>

                  <div className="mt-6 space-y-2.5" role="radiogroup">
                    {OPTION_KEYS.map((key) => {
                      const selected = answers[question.id] === key;
                      const label = question[`option${key}` as const];
                      return (
                        <button
                          key={key}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          onClick={() => selectOption(key)}
                          className={cn(
                            "flex w-full items-center gap-3.5 rounded-xl border px-4 py-3.5 text-left text-[14px] transition-all duration-150",
                            selected
                              ? "border-primary bg-primary/5 shadow-[0_0_0_1px_var(--primary)]"
                              : "border-border hover:border-primary/40 hover:bg-subtle"
                          )}
                        >
                          <span
                            className={cn(
                              "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold transition-colors",
                              selected
                                ? "bg-primary text-primary-foreground"
                                : "bg-subtle text-muted-foreground"
                            )}
                          >
                            {key}
                          </span>
                          <span className="leading-snug">{label}</span>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
      
              <div className="mt-5 flex items-center justify-between">
                <Button
                  variant="outline"
                  className="rounded-xl"
                  disabled={current === 0}
                  onClick={() => setCurrent((c) => c - 1)}
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  {t("back")}
                </Button>

                {current < questions.length - 1 ? (
                  <Button
                    className="rounded-xl"
                    disabled={!answers[question.id]}
                    onClick={() => setCurrent((c) => c + 1)}
                  >
                    {t("next")}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Button>
                ) : (
                  <Button
                    className="min-w-[140px] rounded-xl"
                    disabled={!allAnswered || submitting}
                    onClick={submit}
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : (
                      t("submit")
                    )}
                  </Button>
                )}
              </div>

              {/* Question dots */}
              <div className="mt-5 flex flex-wrap justify-center gap-1.5">
                {questions.map((q, i) => (
                  <button
                    key={q.id}
                    type="button"
                    aria-label={t("questionLabel", { number: i + 1 })}
                    onClick={() => setCurrent(i)}
                    className={cn(
                      "h-2 rounded-full transition-all duration-200",
                      i === current
                        ? "w-6 bg-primary"
                        : answers[q.id]
                          ? "w-2 bg-primary/40"
                          : "w-2 bg-border"
                    )}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {/* ── Result ────────────────────────────────────────── */}
          {phase === "result" && result && (
            <motion.div
              key="result"
              initial={reducedMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: [0, 0, 0.2, 1] }}
            >
              <div
                className={cn(
                  "rounded-2xl p-8 text-center shadow-sm",
                  result.passed
                    ? "bg-gradient-to-br from-success/15 via-card to-card ring-1 ring-success/30"
                    : "bg-gradient-to-br from-warning/10 via-card to-card ring-1 ring-warning/30"
                )}
              >
                <div
                  className={cn(
                    "mx-auto flex h-20 w-20 items-center justify-center rounded-full",
                    result.passed
                      ? "bg-success/15 text-success"
                      : "bg-warning/15 text-warning-dark"
                  )}
                >
                  {result.passed ? (
                    <Trophy className="h-10 w-10" aria-hidden="true" />
                  ) : (
                    <RotateCcw className="h-10 w-10" aria-hidden="true" />
                  )}
                </div>

                <h2 className="mt-5 text-[22px] font-bold">
                  {result.passed ? t("passedTitle") : t("failedTitle")}
                </h2>
                <p className="mt-1 text-[14px] text-muted-foreground">
                  {t("resultSummary", {
                    correct: result.correctCount,
                    total: result.totalQuestions,
                  })}
                </p>

                <p
                  className={cn(
                    "mt-4 text-[44px] font-bold tabular-nums leading-none",
                    result.passed ? "text-success" : "text-warning-dark"
                  )}
                >
                  {result.score}%
                </p>
                <p className="mt-1 text-[12px] text-muted-foreground">
                  {t("thresholdNote", { threshold: result.passingThreshold })}
                </p>

                {result.coinsAwarded > 0 && (
                  <motion.p
                    initial={reducedMotion ? false : { scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.3, type: "spring", stiffness: 300 }}
                    className="mx-auto mt-4 inline-flex items-center gap-1.5 rounded-full bg-coin/15 px-4 py-1.5 text-[14px] font-bold text-coin-dark"
                  >
                    🪙 +{result.coinsAwarded} {t("coinsEarned")}
                  </motion.p>
                )}

                <div className="mt-7 flex flex-wrap justify-center gap-3">
                  {!result.passed && (
                    <Button
                      className="rounded-xl"
                      onClick={() => {
                        setAnswers({});
                        setCurrent(0);
                        setResult(null);
                        setPhase("quiz");
                      }}
                    >
                      <RotateCcw className="h-4 w-4" aria-hidden="true" />
                      {t("tryAgain")}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    className="rounded-xl"
                    nativeButton={false}
                    render={<Link href={backHref} />}
                  >
                    {t("backToTraining")}
                  </Button>
                </div>
              </div>

              {/* ── Answer review ───────────────────────────── */}
              <h3 className="mb-3 mt-8 text-[15px] font-semibold">
                {t("reviewHeading")}
              </h3>
              <div className="space-y-3">
                {result.results.map((r, i) => {
                  const q = questions.find((q) => q.id === r.questionId);
                  if (!q) return null;
                  return (
                    <div
                      key={r.questionId}
                      className="rounded-2xl bg-card p-5 shadow-sm"
                    >
                      <div className="flex items-start gap-3">
                        {r.correct ? (
                          <CheckCircle2
                            className="mt-0.5 h-5 w-5 shrink-0 text-success"
                            aria-hidden="true"
                          />
                        ) : (
                          <XCircle
                            className="mt-0.5 h-5 w-5 shrink-0 text-destructive"
                            aria-hidden="true"
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-[14px] font-medium leading-relaxed">
                            {i + 1}. {q.questionText}
                          </p>
                          <div className="mt-2 space-y-1 text-[13px]">
                            {!r.correct && r.yourAnswer && (
                              <p className="text-destructive">
                                {t("yourAnswer")}:{" "}
                                {q[`option${r.yourAnswer}` as const]}
                              </p>
                            )}
                            <p className="text-success">
                              {t("correctAnswer")}:{" "}
                              {q[`option${r.correctOption}` as const]}
                            </p>
                            <p className="mt-1.5 rounded-lg bg-subtle px-3 py-2 leading-relaxed text-muted-foreground">
                              {r.explanation}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
      </div>
    </DashboardLayout>
  );
}
