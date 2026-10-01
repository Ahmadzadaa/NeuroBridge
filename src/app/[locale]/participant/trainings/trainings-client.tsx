"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import {
  BookOpen,
  Clock,
  GraduationCap,
  CheckCircle2,
  PlayCircle,
  Trophy,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { LargeTitle } from "@/components/ui/ios";
import { EmptyState } from "@/components/ui/empty-state";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export interface TrainingItem {
  id: string;
  title: string;
  description: string;
  category: string;
  lessonCount: number;
  totalMinutes: number;
  completedLessons: number;
  exam: {
    id: string;
    questionCount: number;
    passingThreshold: number;
    attempt: { score: number; passed: boolean } | null;
  } | null;
}

interface TrainingsClientProps {
  locale: string;
  userName: string;
  coinBalance: number;
  trainings: TrainingItem[];
}

export function TrainingsClient({
  locale,
  userName,
  coinBalance,
  trainings,
}: TrainingsClientProps) {
  const t = useTranslations("participant.trainings");
  const tc = useTranslations("common");

  return (
    <DashboardLayout
      panel="participant"
      title={t("title")}
      userName={userName}
      coinBalance={coinBalance}
    >
      <LargeTitle className="mb-6" title={t("title")} subtitle={t("subtitle")} />

      {trainings.length === 0 ? (
        <div className="rounded-[22px] bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)] ring-1 ring-border/60">
          <EmptyState title={tc("noData")} />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {trainings.map((training, i) => {
            const percent =
              training.lessonCount === 0
                ? 0
                : Math.round(
                    (training.completedLessons / training.lessonCount) * 100
                  );
            const examPassed = training.exam?.attempt?.passed ?? false;
            const started = training.completedLessons > 0 || training.exam?.attempt;

            return (
              <motion.div
                key={training.id}
                style={{ "--i": i } as React.CSSProperties}
              className="ios-reveal"
              >
                <Link
                  href={`/${locale}/participant/trainings/${training.id}`}
                  className={cn(
                    "group flex h-full flex-col rounded-[22px] bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)] ring-1 ring-border/60 p-6 ring-1 ring-transparent",
                    "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:ring-primary/20"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div
                      className={cn(
                        "flex h-11 w-11 items-center justify-center rounded-xl",
                        examPassed
                          ? "bg-success/10 text-success"
                          : "bg-primary/10 text-primary"
                      )}
                    >
                      {examPassed ? (
                        <Trophy className="h-5 w-5" aria-hidden="true" />
                      ) : (
                        <GraduationCap className="h-5 w-5" aria-hidden="true" />
                      )}
                    </div>
                    {examPassed ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 text-[11px] font-semibold text-success">
                        <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                        {t("examPassed")}
                      </span>
                    ) : started ? (
                      <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
                        {t("inProgress")}
                      </span>
                    ) : null}
                  </div>

                  <h3 className="mt-4 text-[16px] font-semibold leading-snug">
                    {training.title}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">
                    {training.description}
                  </p>

                  <div className="mt-4 flex items-center gap-4 text-[12px] text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                      {t("lessonCount", { count: training.lessonCount })}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                      {t("minuteCount", { count: training.totalMinutes })}
                    </span>
                  </div>

                  <div className="mt-auto pt-5">
                    <div className="mb-1.5 flex items-center justify-between text-[12px]">
                      <span className="font-medium text-muted-foreground">
                        {t("progress")}
                      </span>
                      <span className="font-semibold">{percent}%</span>
                    </div>
                    <Progress value={percent} className="h-1.5" />

                    <div className="mt-4 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-[13px] font-semibold text-primary">
                        <PlayCircle className="h-4 w-4" aria-hidden="true" />
                        {started ? t("continue") : t("start")}
                      </span>
                      {training.exam?.attempt && (
                        <span className="text-[12px] font-medium text-muted-foreground">
                          {t("bestScore")}: {training.exam.attempt.score}%
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
