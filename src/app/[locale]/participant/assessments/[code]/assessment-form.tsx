"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Pause before moving on, so the participant sees the answer they picked. */
const ADVANCE_DELAY_MS = 350;

/**
 * One statement at a time: picking an answer moves on to the next, "Back"
 * returns to revise, and the last statement offers the submit button. Seeing
 * the whole list at once invites comparing answers instead of reacting to each.
 */
export function AssessmentForm({
  code,
  scaleMin,
  scaleMax,
  questions,
}: {
  code: string;
  scaleMin: number;
  scaleMax: number;
  questions: { id: string; text: string }[];
}) {
  const t = useTranslations("assessments");
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [current, setCurrent] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const advance = useRef<ReturnType<typeof setTimeout> | null>(null);
  const headingRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => () => {
    if (advance.current) clearTimeout(advance.current);
  }, []);
  // Keyboard and screen-reader users land on the new statement.
  useEffect(() => {
    headingRef.current?.focus();
  }, [current]);

  const scale = Array.from({ length: scaleMax - scaleMin + 1 }, (_, i) => scaleMin + i);
  // Named anchors only exist for the standard 5-point agreement scale.
  const labelFor = (value: number) =>
    scaleMin === 1 && scaleMax === 5 ? t(`likert.${value as 1 | 2 | 3 | 4 | 5}`) : String(value);
  const answered = Object.keys(answers).length;
  const question = questions[current];
  const isLast = current === questions.length - 1;
  const percent = Math.round((answered / questions.length) * 100);

  function choose(value: number) {
    setAnswers((a) => ({ ...a, [question.id]: value }));
    setError(null);
    if (advance.current) clearTimeout(advance.current);
    if (!isLast) advance.current = setTimeout(() => setCurrent((c) => Math.min(c + 1, questions.length - 1)), ADVANCE_DELAY_MS);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (answered < questions.length) {
      setError(t("answerAll"));
      setCurrent(questions.findIndex((q) => answers[q.id] === undefined));
      return;
    }
    setSubmitting(true);
    setError(null);
    const res = await fetch(`/api/assessments/${code}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers }),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (!res?.ok) {
      setError(res?.status === 409 ? t("alreadyDone") : t("submitError"));
      setSubmitting(false);
      return;
    }
    router.push(data?.analysisComplete ? "/participant/assessments/results" : "/participant/assessments");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{t("questionN", { n: current + 1 })} / {questions.length}</span>
          <span aria-live="polite">{t("progress", { answered, total: questions.length })}</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
          <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${percent}%` }} />
        </div>
      </div>

      <fieldset
        key={question.id}
        className="animate-enter rounded-[22px] bg-card p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)] ring-1 ring-border/60 sm:p-6"
      >
        <legend className="sr-only">{t("questionN", { n: current + 1 })}</legend>
        <p ref={headingRef} tabIndex={-1} className="text-[17px] font-semibold leading-snug text-foreground outline-none">
          <span className="mr-2 text-muted-foreground">{current + 1}.</span>
          {question.text}
        </p>
        <div className="mt-5 grid gap-2 sm:grid-cols-5">
          {scale.map((value) => (
            <label
              key={value}
              className="flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm transition-colors hover:bg-muted/50 has-[:checked]:border-primary has-[:checked]:bg-primary/10"
            >
              <input
                type="radio"
                name={question.id}
                value={value}
                className="h-4 w-4 accent-primary"
                checked={answers[question.id] === value}
                onChange={() => choose(value)}
              />
              {labelFor(value)}
            </label>
          ))}
        </div>
      </fieldset>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between gap-3">
        <Button type="button" variant="outline" disabled={current === 0 || submitting} onClick={() => setCurrent((c) => Math.max(0, c - 1))}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {t("back")}
        </Button>
        {isLast ? (
          <Button type="submit" disabled={submitting || answered < questions.length}>
            {submitting ? t("submitting") : t("submit")}
          </Button>
        ) : (
          <Button
            type="button"
            className={cn(answers[question.id] === undefined && "opacity-60")}
            disabled={answers[question.id] === undefined}
            onClick={() => setCurrent((c) => Math.min(c + 1, questions.length - 1))}
          >
            {t("next")}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        )}
      </div>
    </form>
  );
}
