"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock,
  FileQuestion,
  Loader2,
  PlayCircle,
  Trophy,
} from "lucide-react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface LessonItem {
  id: string;
  title: string;
  content: string;
  videoUrl: string | null;
  estimatedMinutes: number;
  completed: boolean;
}

interface TrainingDetailClientProps {
  locale: string;
  userName: string;
  coinBalance: number;
  training: { id: string; title: string; description: string };
  lessons: LessonItem[];
  exam: {
    id: string;
    questionCount: number;
    passingThreshold: number;
    attempt: { score: number; passed: boolean } | null;
  } | null;
}

/** Normalizes YouTube watch/short URLs to embeddable form. */
function toEmbedUrl(url: string): string {
  const watch = url.match(/youtube\.com\/watch\?v=([\w-]{6,})/);
  if (watch) return `https://www.youtube.com/embed/${watch[1]}`;
  const short = url.match(/youtu\.be\/([\w-]{6,})/);
  if (short) return `https://www.youtube.com/embed/${short[1]}`;
  return url;
}

export function TrainingDetailClient({
  locale,
  userName,
  coinBalance,
  training,
  lessons,
  exam,
}: TrainingDetailClientProps) {
  const t = useTranslations("participant.trainings");
  const router = useRouter();
  const reducedMotion = useReducedMotion();

  const [completed, setCompleted] = useState<Set<string>>(
    () => new Set(lessons.filter((l) => l.completed).map((l) => l.id))
  );
  const firstIncomplete = lessons.findIndex((l) => !l.completed);
  const [activeIndex, setActiveIndex] = useState(
    firstIncomplete === -1 ? 0 : firstIncomplete
  );
  const [saving, setSaving] = useState(false);

  const active = lessons[activeIndex];
  const percent = useMemo(
    () =>
      lessons.length === 0
        ? 0
        : Math.round((completed.size / lessons.length) * 100),
    [completed, lessons.length]
  );
  const allDone = lessons.length > 0 && completed.size === lessons.length;

  async function markComplete() {
    if (!active || saving) return;
    const alreadyDone = completed.has(active.id);

    if (!alreadyDone) {
      setSaving(true);
      try {
        const res = await fetch(`/api/lessons/${active.id}/complete`, {
          method: "POST",
        });
        if (!res.ok) throw new Error("Failed");
        setCompleted((prev) => new Set(prev).add(active.id));
        router.refresh();
      } catch {
        toast.error(t("saveError"));
        setSaving(false);
        return;
      }
      setSaving(false);
    }

    if (activeIndex < lessons.length - 1) {
      setActiveIndex(activeIndex + 1);
    }
  }

  return (
    <DashboardLayout
      panel="participant"
      title={training.title}
      userName={userName}
      coinBalance={coinBalance}
    >
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="mb-6">
        <Link
          href={`/${locale}/participant/trainings`}
          className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          {t("backToTrainings")}
        </Link>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <p className="max-w-2xl text-[14px] text-muted-foreground">
            {training.description}
          </p>
          <div className="flex min-w-[180px] flex-1 items-center gap-3">
            <Progress value={percent} className="h-1.5 flex-1" />
            <span className="text-[13px] font-semibold tabular-nums">
              {percent}%
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
        {/* ── Lesson viewer ───────────────────────────────────── */}
        <div className="min-w-0">
          {active && (
              <motion.div
                key={active.id}
                initial={reducedMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: [0, 0, 0.2, 1] }}
                className="overflow-hidden rounded-2xl bg-card shadow-sm"
              >
                {active.videoUrl && (
                  <div className="aspect-video w-full bg-black">
                    <iframe
                      key={active.id}
                      src={toEmbedUrl(active.videoUrl)}
                      title={active.title}
                      className="h-full w-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                )}
                <div className="p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[12px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">
                        {t("lessonLabel", { number: activeIndex + 1 })}
                      </p>
                      <h2 className="mt-1 text-[18px] font-semibold leading-snug">
                        {active.title}
                      </h2>
                    </div>
                    <span className="flex items-center gap-1.5 rounded-full bg-subtle px-3 py-1 text-[12px] font-medium text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                      {t("minuteCount", { count: active.estimatedMinutes })}
                    </span>
                  </div>

                  <p className="mt-4 whitespace-pre-line text-[14px] leading-relaxed text-foreground/90">
                    {active.content}
                  </p>

                  <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-border pt-5">
                    <Button
                      onClick={markComplete}
                      disabled={saving}
                      className="rounded-xl"
                    >
                      {saving ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      ) : completed.has(active.id) ? (
                        activeIndex < lessons.length - 1 ? (
                          <>
                            {t("nextLesson")}
                            <ChevronRight className="h-4 w-4" aria-hidden="true" />
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                            {t("lessonDone")}
                          </>
                        )
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                          {t("markComplete")}
                        </>
                      )}
                    </Button>
                    {completed.has(active.id) && (
                      <span className="flex items-center gap-1.5 text-[13px] font-medium text-success">
                        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                        {t("completedLesson")}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
          )}
        </div>

        {/* ── Playlist + exam ─────────────────────────────────── */}
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl bg-card shadow-sm">
            <div className="border-b border-border px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">
              {t("lessonsHeading")} · {completed.size}/{lessons.length}
            </div>
            {lessons.map((lesson, i) => {
              const isActive = i === activeIndex;
              const isDone = completed.has(lesson.id);
              return (
                <button
                  key={lesson.id}
                  type="button"
                  onClick={() => setActiveIndex(i)}
                  className={cn(
                    "flex w-full items-center gap-3 border-b border-border/60 px-4 py-3 text-left text-[13px] transition-colors last:border-0",
                    isActive ? "bg-accent/60" : "hover:bg-subtle"
                  )}
                >
                  {isDone ? (
                    <CheckCircle2
                      className="h-4.5 w-4.5 shrink-0 text-success"
                      aria-hidden="true"
                    />
                  ) : isActive ? (
                    <PlayCircle
                      className="h-4.5 w-4.5 shrink-0 text-primary"
                      aria-hidden="true"
                    />
                  ) : (
                    <Circle
                      className="h-4.5 w-4.5 shrink-0 text-border"
                      aria-hidden="true"
                    />
                  )}
                  <span
                    className={cn(
                      "flex-1 leading-snug",
                      isActive && "font-semibold"
                    )}
                  >
                    {lesson.title}
                  </span>
                  <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                    {lesson.estimatedMinutes}′
                  </span>
                </button>
              );
            })}
          </div>

          {exam && (
            <div
              className={cn(
                "rounded-2xl p-5 shadow-sm",
                exam.attempt?.passed
                  ? "bg-gradient-to-br from-success/15 to-transparent ring-1 ring-success/30"
                  : "bg-card ring-1 ring-border"
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-xl",
                    exam.attempt?.passed
                      ? "bg-success/15 text-success"
                      : "bg-primary/10 text-primary"
                  )}
                >
                  {exam.attempt?.passed ? (
                    <Trophy className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <FileQuestion className="h-5 w-5" aria-hidden="true" />
                  )}
                </div>
                <div>
                  <p className="text-[14px] font-semibold">{t("examHeading")}</p>
                  <p className="text-[12px] text-muted-foreground">
                    {t("examMeta", {
                      count: exam.questionCount,
                      threshold: exam.passingThreshold,
                    })}
                  </p>
                </div>
              </div>

              {exam.attempt && (
                <p className="mt-3 text-[13px]">
                  {t("bestScore")}:{" "}
                  <span
                    className={cn(
                      "font-bold",
                      exam.attempt.passed ? "text-success" : "text-warning-dark"
                    )}
                  >
                    {exam.attempt.score}%
                  </span>
                </p>
              )}

              <Button
                className="mt-4 w-full rounded-xl"
                variant={exam.attempt?.passed ? "outline" : "default"}
                render={
                  <Link
                    href={`/${locale}/participant/trainings/${training.id}/exam`}
                  />
                }
              >
                {exam.attempt ? t("retakeExam") : t("takeExam")}
              </Button>
              {!allDone && !exam.attempt && (
                <p className="mt-2 text-center text-[11px] text-muted-foreground">
                  {t("examHint")}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
