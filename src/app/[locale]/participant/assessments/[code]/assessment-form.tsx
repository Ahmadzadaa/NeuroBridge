"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

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
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const scale = Array.from({ length: scaleMax - scaleMin + 1 }, (_, i) => scaleMin + i);
  // Named anchors only exist for the standard 5-point agreement scale.
  const labelFor = (value: number) =>
    scaleMin === 1 && scaleMax === 5 ? t(`likert.${value as 1 | 2 | 3 | 4 | 5}`) : String(value);
  const answered = Object.keys(answers).length;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (answered < questions.length) {
      setError(t("answerAll"));
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
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {t("progress", { answered, total: questions.length })}
      </p>
      {questions.map((q, index) => (
        <fieldset key={q.id} className="rounded-2xl bg-card p-5 shadow-sm">
          <legend className="sr-only">{t("questionN", { n: index + 1 })}</legend>
          <p className="font-medium text-foreground">
            <span className="mr-2 text-muted-foreground">{index + 1}.</span>
            {q.text}
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-5">
            {scale.map((value) => (
              <label
                key={value}
                className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/10"
              >
                <input
                  type="radio"
                  name={q.id}
                  value={value}
                  required
                  className="h-4 w-4 accent-primary"
                  checked={answers[q.id] === value}
                  onChange={() => setAnswers((a) => ({ ...a, [q.id]: value }))}
                />
                {labelFor(value)}
              </label>
            ))}
          </div>
        </fieldset>
      ))}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" className="w-full sm:w-auto" disabled={submitting}>
        {submitting ? t("submitting") : t("submit")}
      </Button>
    </form>
  );
}
