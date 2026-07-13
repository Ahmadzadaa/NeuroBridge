"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ChevronDown, Crown, Users } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

export interface RankingCriterion {
  id: string;
  name: string;
  maxScore: number;
  weight: number;
}

export interface RankingRow {
  teamId: string;
  teamName: string;
  slogan: string | null;
  memberCount: number;
  submissionTitle: string | null;
  total: number | null;
  juryCount: number;
  rank: number;
  breakdown: {
    criterionId: string;
    name: string;
    maxScore: number;
    weight: number;
    average: number | null;
    juryCount: number;
  }[];
}

interface RankingsTableProps {
  rankings: RankingRow[];
  highlightTeamId?: string;
}

const medalColors = ["text-coin", "text-tertiary", "text-warning-dark"];

export function RankingsTable({ rankings, highlightTeamId }: RankingsTableProps) {
  const t = useTranslations("hackathon.rankings");
  const tc = useTranslations("common");
  const reducedMotion = useReducedMotion();
  const [expanded, setExpanded] = useState<string | null>(null);

  if (rankings.length === 0) {
    return (
      <div className="rounded-2xl bg-card shadow-sm">
        <EmptyState title={tc("noData")} />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-card shadow-sm">
      <div className="flex items-center gap-4 border-b border-border px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">
        <span className="w-10">{t("rank")}</span>
        <span className="flex-1">{t("team")}</span>
        <span className="hidden w-32 sm:block">{t("project")}</span>
        <span className="w-16 text-right">{t("juries")}</span>
        <span className="w-20 text-right">{t("score")}</span>
        <span className="w-8" />
      </div>

      {rankings.map((row) => {
        const isOpen = expanded === row.teamId;
        const isMine = row.teamId === highlightTeamId;
        return (
          <div
            key={row.teamId}
            className={cn(
              "border-b border-border/60 last:border-0",
              isMine && "bg-accent/40"
            )}
          >
            <button
              type="button"
              onClick={() => setExpanded(isOpen ? null : row.teamId)}
              className="flex w-full items-center gap-4 px-4 py-3.5 text-left text-[14px] transition-colors hover:bg-subtle"
              aria-expanded={isOpen}
            >
              <span className="flex w-10 items-center gap-1 font-bold tabular-nums">
                {row.rank <= 3 && row.total !== null ? (
                  <Crown
                    className={cn("h-4 w-4", medalColors[row.rank - 1])}
                    aria-hidden="true"
                  />
                ) : null}
                {row.rank}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">
                  {row.teamName}
                  {isMine && (
                    <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                      {t("yourTeam")}
                    </span>
                  )}
                </span>
                <span className="mt-0.5 flex items-center gap-1 text-[12px] text-muted-foreground">
                  <Users className="h-3 w-3" aria-hidden="true" />
                  {row.memberCount}
                  {row.slogan && <span className="truncate"> · {row.slogan}</span>}
                </span>
              </span>
              <span className="hidden w-32 truncate text-[13px] text-muted-foreground sm:block">
                {row.submissionTitle ?? t("noSubmission")}
              </span>
              <span className="w-16 text-right text-[13px] tabular-nums text-muted-foreground">
                {row.juryCount}
              </span>
              <span
                className={cn(
                  "w-20 text-right text-[15px] font-bold tabular-nums",
                  row.total === null
                    ? "text-muted-foreground"
                    : row.rank === 1
                      ? "text-coin-dark"
                      : "text-foreground"
                )}
              >
                {row.total === null ? "—" : row.total.toFixed(1)}
              </span>
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
                  <div className="grid grid-cols-1 gap-2 bg-subtle/60 px-4 py-4 sm:grid-cols-2 lg:grid-cols-3">
                    {row.breakdown.map((b) => {
                      const percent =
                        b.average === null ? 0 : (b.average / b.maxScore) * 100;
                      return (
                        <div
                          key={b.criterionId}
                          className="rounded-xl bg-card p-3.5 shadow-sm"
                        >
                          <div className="flex items-baseline justify-between gap-2">
                            <p className="truncate text-[12px] font-medium">
                              {b.name}
                            </p>
                            <p className="shrink-0 text-[13px] font-bold tabular-nums">
                              {b.average === null
                                ? "—"
                                : `${(Math.round(b.average * 10) / 10).toLocaleString()} / ${b.maxScore}`}
                            </p>
                          </div>
                          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-subtle">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all duration-500",
                                percent >= 70
                                  ? "bg-success"
                                  : percent >= 40
                                    ? "bg-coin"
                                    : "bg-warning"
                              )}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                          <p className="mt-1.5 text-[10px] text-muted-foreground">
                            {t("weight")}: ×{b.weight} · {t("juryVotes", { count: b.juryCount })}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
