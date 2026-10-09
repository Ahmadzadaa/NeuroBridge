"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  CheckCircle2,
  ChevronDown,
  Clock3,
  Coins,
  GraduationCap,
  Heart,
  Loader2,
  Save,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { LargeTitle } from "@/components/ui/ios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { formatSimMoney } from "@/lib/simulation/money";

interface DecisionRow {
  round: number;
  roundTitle: string;
  choiceLabel: string;
  cashAfter: number;
  satisfactionAfter: number;
  reputationAfter: number;
}

export interface GradingRun {
  id: string;
  studentName: string;
  studentEmail: string;
  simulationName: string;
  score: number;
  cash: number;
  satisfaction: number;
  reputation: number;
  completedAt: string;
  teacherGrade: number | null;
  teacherMaxGrade: number | null;
  teacherComment: string | null;
  decisions: DecisionRow[];
}

interface SimulationGradingClientProps {
  locale: string;
  userName: string;
  canGrade: boolean;
  runs: GradingRun[];
  /** Which dashboard shell to render in — dean ("tenant") or teacher. */
  panel?: "tenant" | "teacher";
}

export function SimulationGradingClient({
  locale,
  userName,
  canGrade,
  runs,
  panel = "tenant",
}: SimulationGradingClientProps) {
  const t = useTranslations("simulation.grading");
  const tc = useTranslations("common");
  const router = useRouter();
  const reducedMotion = useReducedMotion();

  const [expanded, setExpanded] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<
    Record<string, { grade: string; maxGrade: string; comment: string }>
  >({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const pending = runs.filter((r) => r.teacherGrade === null);
  const graded = runs.filter((r) => r.teacherGrade !== null);

  function draftFor(run: GradingRun) {
    return (
      drafts[run.id] ?? {
        grade: run.teacherGrade?.toString() ?? "",
        maxGrade: (run.teacherMaxGrade ?? 20).toString(),
        comment: run.teacherComment ?? "",
      }
    );
  }

  async function saveGrade(run: GradingRun) {
    const draft = draftFor(run);
    const grade = Number(draft.grade);
    const maxGrade = Number(draft.maxGrade);
    if (!Number.isInteger(grade) || !Number.isInteger(maxGrade)) return;
    if (grade < 0 || maxGrade < 1 || grade > maxGrade) {
      toast.error(t("invalidGrade"));
      return;
    }
    setSavingId(run.id);
    try {
      const res = await fetch(`/api/simulations/runs/${run.id}/grade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grade,
          maxGrade,
          comment: draft.comment.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success(t("gradeSaved"));
      router.refresh();
    } catch {
      toast.error(tc("error"));
    } finally {
      setSavingId(null);
    }
  }

  const renderRun = (run: GradingRun) => {
    const isOpen = expanded === run.id;
    const draft = draftFor(run);
    return (
      <div
        key={run.id}
        className="overflow-hidden rounded-[22px] bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)] ring-1 ring-border/60"
      >
        <button
          type="button"
          onClick={() => setExpanded(isOpen ? null : run.id)}
          aria-expanded={isOpen}
          className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-subtle"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
            {run.studentName
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[14px] font-semibold">
              {run.studentName}
            </span>
            <span className="block truncate text-[12px] text-muted-foreground">
              {run.simulationName} ·{" "}
              {new Date(run.completedAt).toLocaleDateString(locale)}
            </span>
          </span>
          <span className="hidden shrink-0 items-center gap-3 text-[12px] tabular-nums text-muted-foreground sm:flex">
            <span className="flex items-center gap-1">
              <Coins className="h-3.5 w-3.5 text-coin-dark" aria-hidden="true" />
              {formatSimMoney(run.cash, locale)}
            </span>
            <span className="flex items-center gap-1">
              <Heart className="h-3.5 w-3.5 text-destructive" aria-hidden="true" />
              {run.satisfaction}%
            </span>
            <span className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              {run.reputation}%
            </span>
          </span>
          <span
            className={cn(
              "shrink-0 rounded-full px-3 py-1 text-[13px] font-bold tabular-nums",
              run.score >= 70
                ? "bg-success/10 text-success"
                : "bg-warning/10 text-warning-dark"
            )}
          >
            {run.score}
          </span>
          {run.teacherGrade !== null && (
            <span className="shrink-0 rounded-full bg-primary/10 px-3 py-1 text-[12px] font-bold text-primary">
              {run.teacherGrade}/{run.teacherMaxGrade}
            </span>
          )}
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
              isOpen && "rotate-180"
            )}
            aria-hidden="true"
          />
        </button>

        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              initial={reducedMotion ? false : { height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={reducedMotion ? undefined : { height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0, 0, 0.2, 1] }}
              className="overflow-hidden"
            >
              <div className="border-t border-border bg-subtle/50 px-5 py-4">
                {/* Decision timeline */}
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">
                  {t("decisions")}
                </p>
                <div className="space-y-1.5">
                  {run.decisions.map((decision) => (
                    <div
                      key={decision.round}
                      className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-card px-3.5 py-2.5 text-[12px]"
                    >
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                        {decision.round}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="font-medium">{decision.roundTitle}:</span>{" "}
                        {decision.choiceLabel}
                      </span>
                      <span className="shrink-0 tabular-nums text-muted-foreground">
                        {formatSimMoney(decision.cashAfter, locale)} ·{" "}
                        {decision.satisfactionAfter}% · {decision.reputationAfter}%
                      </span>
                    </div>
                  ))}
                </div>

                {/* Grading form */}
                {canGrade && (
                  <div className="mt-4 border-t border-border pt-4">
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">
                      {t("gradeHeading")}
                    </p>
                    <div className="flex flex-wrap items-end gap-3">
                      <div>
                        <label
                          htmlFor={`grade-${run.id}`}
                          className="mb-1 block text-[12px] font-medium"
                        >
                          {t("grade")}
                        </label>
                        <div className="flex items-center gap-1.5">
                          <Input
                            id={`grade-${run.id}`}
                            type="number"
                            min={0}
                            value={draft.grade}
                            onChange={(e) =>
                              setDrafts((prev) => ({
                                ...prev,
                                [run.id]: { ...draft, grade: e.target.value },
                              }))
                            }
                            className="h-9 w-20 rounded-lg text-center"
                          />
                          <span className="text-muted-foreground">/</span>
                          <Input
                            type="number"
                            min={1}
                            aria-label={t("maxGrade")}
                            value={draft.maxGrade}
                            onChange={(e) =>
                              setDrafts((prev) => ({
                                ...prev,
                                [run.id]: { ...draft, maxGrade: e.target.value },
                              }))
                            }
                            className="h-9 w-20 rounded-lg text-center"
                          />
                        </div>
                      </div>
                      <div className="min-w-[200px] flex-1">
                        <label
                          htmlFor={`comment-${run.id}`}
                          className="mb-1 block text-[12px] font-medium"
                        >
                          {t("comment")}
                        </label>
                        <Textarea
                          id={`comment-${run.id}`}
                          maxLength={600}
                          value={draft.comment}
                          onChange={(e) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [run.id]: { ...draft, comment: e.target.value },
                            }))
                          }
                          placeholder={t("commentPlaceholder")}
                          className="min-h-9 rounded-lg text-[13px]"
                        />
                      </div>
                      <Button
                        className="h-9 rounded-lg"
                        disabled={savingId === run.id || draft.grade === ""}
                        onClick={() => saveGrade(run)}
                      >
                        {savingId === run.id ? (
                          <Loader2
                            className="h-4 w-4 animate-spin"
                            aria-hidden="true"
                          />
                        ) : (
                          <>
                            <Save className="h-4 w-4" aria-hidden="true" />
                            {run.teacherGrade !== null
                              ? t("updateGrade")
                              : t("saveGrade")}
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <DashboardLayout panel={panel} title={t("title")} userName={userName}>
      <LargeTitle className="mb-6" title={t("title")} subtitle={t("subtitle")} />

      {runs.length === 0 ? (
        <div className="rounded-[22px] bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)] ring-1 ring-border/60">
          <EmptyState title={tc("noData")} description={t("empty")} />
        </div>
      ) : (
        <div className="space-y-8">
          {pending.length > 0 && (
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">
                <Clock3 className="h-4 w-4" aria-hidden="true" />
                {t("pendingHeading")} ({pending.length})
              </h2>
              <div className="space-y-3">{pending.map(renderRun)}</div>
            </section>
          )}
          {graded.length > 0 && (
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                {t("gradedHeading")} ({graded.length})
              </h2>
              <div className="space-y-3">{graded.map(renderRun)}</div>
            </section>
          )}
        </div>
      )}

      {!canGrade && runs.length > 0 && (
        <p className="mt-4 flex items-center gap-1.5 text-[12px] text-muted-foreground">
          <GraduationCap className="h-3.5 w-3.5" aria-hidden="true" />
          {t("viewerNote")}
        </p>
      )}
    </DashboardLayout>
  );
}
