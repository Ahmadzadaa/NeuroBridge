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
  Coins,
  Gamepad2,
  GraduationCap,
  Heart,
  Loader2,
  RotateCcw,
  Star,
  Target,
  Trophy,
} from "lucide-react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { formatSimMoney } from "@/lib/simulation/money";

interface MetricState {
  cash: number;
  satisfaction: number;
  reputation: number;
}

interface DecideOutcome {
  state: MetricState;
  deltas: MetricState;
  feedback: string;
  completed: boolean;
  score: number | null;
  coinsAwarded: number;
}

interface SimulationPlayClientProps {
  locale: string;
  userName: string;
  coinBalance: number;
  simulation: {
    id: string;
    name: string;
    description: string | null;
    startCash: number;
    targetCash: number;
    totalRounds: number;
  };
  activeRun: {
    id: string;
    currentRound: number;
    cash: number;
    satisfaction: number;
    reputation: number;
  } | null;
  currentRound: {
    order: number;
    title: string;
    context: string;
    choices: { id: string; label: string; detail: string | null }[];
  } | null;
  lastCompleted: {
    score: number;
    cash: number;
    satisfaction: number;
    reputation: number;
    teacherGrade: number | null;
    teacherMaxGrade: number | null;
    teacherComment: string | null;
  } | null;
}

function MetricChip({
  icon: Icon,
  label,
  value,
  delta,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  delta?: number;
  accent: string;
}) {
  return (
    <div className="flex flex-1 items-center gap-2.5 rounded-xl bg-card px-3.5 py-2.5 shadow-sm ring-1 ring-border/60">
      <span
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
          accent
        )}
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block text-[10px] font-semibold uppercase tracking-[0.5px] text-muted-foreground">
          {label}
        </span>
        <span className="flex items-baseline gap-1.5">
          <span className="text-[15px] font-bold tabular-nums">{value}</span>
          {delta !== undefined && delta !== 0 && (
            <span
              className={cn(
                "text-[11px] font-bold tabular-nums",
                delta > 0 ? "text-success" : "text-destructive"
              )}
            >
              {delta > 0 ? "+" : ""}
              {delta}
            </span>
          )}
        </span>
      </span>
    </div>
  );
}

export function SimulationPlayClient({
  locale,
  userName,
  coinBalance,
  simulation,
  activeRun,
  currentRound,
  lastCompleted,
}: SimulationPlayClientProps) {
  const t = useTranslations("simulation.play");
  const tc = useTranslations("common");
  const router = useRouter();
  const reducedMotion = useReducedMotion();

  const [busy, setBusy] = useState(false);
  const [choosing, setChoosing] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<DecideOutcome | null>(null);

  const backHref = `/${locale}/participant/simulations`;

  async function startRun() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/simulations/${simulation.id}/runs`, {
        method: "POST",
      });
      if (!res.ok) throw new Error();
      setOutcome(null);
      router.refresh();
    } catch {
      toast.error(tc("error"));
    } finally {
      setBusy(false);
    }
  }

  async function decide(choiceId: string) {
    if (!activeRun || busy) return;
    setBusy(true);
    setChoosing(choiceId);
    try {
      const res = await fetch(`/api/simulations/runs/${activeRun.id}/decide`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ choiceId, locale }),
      });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as DecideOutcome;
      setOutcome(data);
      router.refresh();
      if (data.completed && (data.score ?? 0) >= 70 && !reducedMotion) {
        confetti({
          particleCount: 140,
          spread: 90,
          origin: { y: 0.35 },
          disableForReducedMotion: true,
        });
      }
    } catch {
      toast.error(tc("error"));
    } finally {
      setBusy(false);
      setChoosing(null);
    }
  }

  const displayedState = outcome?.state ??
    (activeRun
      ? {
          cash: activeRun.cash,
          satisfaction: activeRun.satisfaction,
          reputation: activeRun.reputation,
        }
      : null);

  return (
    <DashboardLayout
      panel="participant"
      title={simulation.name}
      userName={userName}
      coinBalance={coinBalance}
    >
      <Link
        href={backHref}
        className="mb-5 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        {t("backToList")}
      </Link>

      <div className="mx-auto max-w-3xl">
        {/* ── Metrics bar (while playing) ─────────────────────── */}
        {displayedState && activeRun && (
          <div className="mb-5">
            <div className="mb-3 flex items-center gap-4">
              <Progress
                value={
                  ((activeRun.currentRound - (outcome && !outcome.completed ? 0 : 1)) /
                    simulation.totalRounds) *
                  100
                }
                className="h-1.5 flex-1"
              />
              <span className="text-[13px] font-semibold tabular-nums text-muted-foreground">
                {t("roundLabel", {
                  current: Math.min(activeRun.currentRound, simulation.totalRounds),
                  total: simulation.totalRounds,
                })}
              </span>
            </div>
            <div className="flex flex-col gap-2.5 sm:flex-row">
              <MetricChip
                icon={Coins}
                label={t("metrics.cash")}
                value={formatSimMoney(displayedState.cash, locale)}
                delta={outcome?.deltas.cash}
                accent="bg-coin/15 text-coin-dark"
              />
              <MetricChip
                icon={Heart}
                label={t("metrics.satisfaction")}
                value={`${displayedState.satisfaction}%`}
                delta={outcome?.deltas.satisfaction}
                accent="bg-destructive/10 text-destructive"
              />
              <MetricChip
                icon={Star}
                label={t("metrics.reputation")}
                value={`${displayedState.reputation}%`}
                delta={outcome?.deltas.reputation}
                accent="bg-primary/10 text-primary"
              />
            </div>
          </div>
        )}

        {/* ── Outcome overlay (after a decision) ─────────────── */}
        {outcome && (
          <motion.div
            key="outcome"
            initial={reducedMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0, 0, 0.2, 1] }}
            className={cn(
              "rounded-2xl p-6 shadow-sm sm:p-8",
              outcome.completed
                ? "bg-gradient-to-br from-primary/12 via-card to-card ring-1 ring-primary/20"
                : "bg-card ring-1 ring-border"
            )}
          >
            {outcome.completed ? (
              <div className="text-center">
                <div
                  className={cn(
                    "mx-auto flex h-20 w-20 items-center justify-center rounded-full",
                    (outcome.score ?? 0) >= 70
                      ? "bg-success/15 text-success"
                      : "bg-warning/15 text-warning-dark"
                  )}
                >
                  <Trophy className="h-10 w-10" aria-hidden="true" />
                </div>
                <h2 className="mt-4 text-[22px] font-bold">
                  {t("completedTitle")}
                </h2>
                <p className="mx-auto mt-2 max-w-md text-[14px] leading-relaxed text-muted-foreground">
                  {outcome.feedback}
                </p>
                <p className="mt-5 text-[48px] font-bold tabular-nums leading-none text-primary">
                  {outcome.score}
                </p>
                <p className="mt-1 text-[12px] text-muted-foreground">
                  {t("scoreLabel")}
                </p>
                {outcome.coinsAwarded > 0 && (
                  <p className="mx-auto mt-4 inline-flex items-center gap-1.5 rounded-full bg-coin/15 px-4 py-1.5 text-[14px] font-bold text-coin-dark">
                    🪙 +{outcome.coinsAwarded}
                  </p>
                )}
                <p className="mt-4 flex items-center justify-center gap-1.5 text-[13px] text-muted-foreground">
                  <GraduationCap className="h-4 w-4" aria-hidden="true" />
                  {t("teacherPending")}
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <Button
                    variant="outline"
                    className="rounded-xl"
                    onClick={() => setOutcome(null)}
                  >
                    {t("viewSummary")}
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-[12px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">
                  {t("outcomeLabel")}
                </p>
                <p className="mt-2 text-[15px] leading-relaxed">
                  {outcome.feedback}
                </p>
                <Button
                  className="mt-6 rounded-xl"
                  onClick={() => setOutcome(null)}
                >
                  {t("nextRound")}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </>
            )}
          </motion.div>
        )}

        {/* ── Active round ────────────────────────────────────── */}
        {!outcome && activeRun && currentRound && (
          <motion.div
            key={currentRound.order}
            initial={reducedMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0, 0, 0.2, 1] }}
            className="rounded-2xl bg-card p-6 shadow-sm sm:p-8"
          >
            <p className="text-[12px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">
              {t("roundTitle", { number: currentRound.order })}
            </p>
            <h2 className="mt-1 text-[18px] font-semibold leading-snug">
              {currentRound.title}
            </h2>
            <p className="mt-3 whitespace-pre-line text-[14px] leading-relaxed text-foreground/90">
              {currentRound.context}
            </p>

            <p className="mt-6 mb-2.5 text-[12px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">
              {t("decisionPrompt")}
            </p>
            <div className="space-y-2.5">
              {currentRound.choices.map((choice) => (
                <button
                  key={choice.id}
                  type="button"
                  disabled={busy}
                  onClick={() => decide(choice.id)}
                  className={cn(
                    "flex w-full items-start gap-3.5 rounded-xl border border-border px-4 py-3.5 text-left transition-all duration-150",
                    "hover:border-primary/50 hover:bg-subtle disabled:opacity-60"
                  )}
                >
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    {choosing === choice.id ? (
                      <Loader2
                        className="h-3.5 w-3.5 animate-spin text-primary"
                        aria-hidden="true"
                      />
                    ) : (
                      <Target className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[14px] font-semibold leading-snug">
                      {choice.label}
                    </span>
                    {choice.detail && (
                      <span className="mt-0.5 block text-[12px] leading-relaxed text-muted-foreground">
                        {choice.detail}
                      </span>
                    )}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Intro / result ──────────────────────────────────── */}
        {!outcome && !activeRun && (
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0, 0, 0.2, 1] }}
            className="rounded-2xl bg-card p-8 shadow-sm"
          >
            {lastCompleted ? (
              <div className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-success/10 text-success">
                  <Trophy className="h-8 w-8" aria-hidden="true" />
                </div>
                <h2 className="mt-4 text-[20px] font-bold">
                  {t("lastResultTitle")}
                </h2>
                <p className="mt-4 text-[44px] font-bold tabular-nums leading-none text-primary">
                  {lastCompleted.score}
                </p>
                <p className="mt-1 text-[12px] text-muted-foreground">
                  {t("scoreLabel")}
                </p>

                <div className="mx-auto mt-6 flex max-w-md flex-col gap-2.5 sm:flex-row">
                  <MetricChip
                    icon={Coins}
                    label={t("metrics.cash")}
                    value={formatSimMoney(lastCompleted.cash, locale)}
                    accent="bg-coin/15 text-coin-dark"
                  />
                  <MetricChip
                    icon={Heart}
                    label={t("metrics.satisfaction")}
                    value={`${lastCompleted.satisfaction}%`}
                    accent="bg-destructive/10 text-destructive"
                  />
                  <MetricChip
                    icon={Star}
                    label={t("metrics.reputation")}
                    value={`${lastCompleted.reputation}%`}
                    accent="bg-primary/10 text-primary"
                  />
                </div>

                {lastCompleted.teacherGrade !== null ? (
                  <div className="mx-auto mt-6 max-w-md rounded-xl bg-success/10 p-4 text-left">
                    <p className="flex items-center gap-2 text-[13px] font-semibold text-success">
                      <GraduationCap className="h-4 w-4" aria-hidden="true" />
                      {t("teacherGraded", {
                        grade: lastCompleted.teacherGrade,
                        max: lastCompleted.teacherMaxGrade ?? 100,
                      })}
                    </p>
                    {lastCompleted.teacherComment && (
                      <p className="mt-1.5 text-[13px] italic leading-relaxed text-muted-foreground">
                        “{lastCompleted.teacherComment}”
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="mt-5 flex items-center justify-center gap-1.5 text-[13px] text-muted-foreground">
                    <GraduationCap className="h-4 w-4" aria-hidden="true" />
                    {t("teacherPending")}
                  </p>
                )}

                <Button
                  size="lg"
                  variant="outline"
                  className="mt-7 min-w-[200px] rounded-xl"
                  disabled={busy}
                  onClick={startRun}
                >
                  {busy ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <>
                      <RotateCcw className="h-4 w-4" aria-hidden="true" />
                      {t("playAgain")}
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Gamepad2 className="h-8 w-8" aria-hidden="true" />
                </div>
                <h2 className="mt-4 text-[20px] font-bold">{simulation.name}</h2>
                {simulation.description && (
                  <p className="mx-auto mt-2 max-w-md text-[14px] leading-relaxed text-muted-foreground">
                    {simulation.description}
                  </p>
                )}
                <div className="mx-auto mt-5 max-w-md rounded-xl bg-subtle p-4 text-left text-[13px] leading-relaxed text-muted-foreground">
                  <p>
                    {t("introRules", {
                      rounds: simulation.totalRounds,
                      cash: formatSimMoney(simulation.startCash, locale),
                      target: formatSimMoney(simulation.targetCash, locale),
                    })}
                  </p>
                </div>
                <Button
                  size="lg"
                  className="mt-7 min-w-[200px] rounded-xl"
                  disabled={busy}
                  onClick={startRun}
                >
                  {busy ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    t("begin")
                  )}
                </Button>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
}
