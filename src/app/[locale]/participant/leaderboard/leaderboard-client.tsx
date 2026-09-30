"use client";

import { useTranslations } from "next-intl";
import { motion, useReducedMotion } from "framer-motion";
import { Crown, Award } from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

export interface LeaderboardEntry {
  id: string;
  rank: number;
  name: string;
  coins: number;
  badges: number;
}

interface LeaderboardClientProps {
  userName: string;
  currentUserId: string;
  coinBalance: number;
  entries: LeaderboardEntry[];
  /** Rank among the student's own university, even outside the top 50. */
  myRank: number | null;
  totalParticipants: number;
}

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/** Gold / silver / bronze treatments for the top 3. */
const podiumStyles = [
  {
    card: "bg-gradient-to-br from-coin/20 via-coin/10 to-transparent ring-2 ring-coin/40 shadow-coin",
    avatar: "h-16 w-16 text-lg ring-2 ring-coin",
    medal: "text-coin",
  },
  {
    card: "bg-gradient-to-br from-tertiary/15 to-transparent ring-1 ring-border",
    avatar: "h-13 w-13 ring-2 ring-tertiary/50",
    medal: "text-tertiary",
  },
  {
    card: "bg-gradient-to-br from-warning-dark/15 to-transparent ring-1 ring-border",
    avatar: "h-13 w-13 ring-2 ring-warning-dark/40",
    medal: "text-warning-dark",
  },
];

export function LeaderboardClient({
  userName,
  currentUserId,
  coinBalance,
  entries,
  myRank,
  totalParticipants,
}: LeaderboardClientProps) {
  const t = useTranslations("participant.leaderboard");
  const tc = useTranslations("common");
  const reducedMotion = useReducedMotion();

  const podium = entries.slice(0, 3);
  const rest = entries.slice(3);
  // Visual order on desktop: 2nd — 1st — 3rd
  const podiumOrder = [podium[1], podium[0], podium[2]].filter(Boolean);

  return (
    <DashboardLayout
      panel="participant"
      title={t("title")}
      userName={userName}
      coinBalance={coinBalance}
    >
      {myRank !== null && (
        <p className="mb-4 rounded-2xl bg-card p-4 text-sm text-foreground shadow-sm">
          {t("myStanding", { coins: coinBalance, rank: myRank, total: totalParticipants })}
        </p>
      )}
      {entries.length === 0 ? (
        <div className="rounded-2xl bg-card shadow-sm">
          <EmptyState title={tc("noData")} />
        </div>
      ) : (
        <>
          {/* ── Podium ──────────────────────────────────────────── */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:items-end">
            {podiumOrder.map((entry, i) => {
              const style = podiumStyles[entry.rank - 1];
              const isFirst = entry.rank === 1;
              return (
                <motion.div
                  key={entry.id}
                  initial={reducedMotion ? false : { opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1, duration: 0.35, ease: [0, 0, 0.2, 1] }}
                  className={cn(
                    "flex flex-col items-center rounded-2xl p-6 text-center",
                    style.card,
                    isFirst && "sm:pb-10"
                  )}
                >
                  {isFirst && (
                    <Crown className="mb-2 h-6 w-6 text-coin" aria-hidden="true" />
                  )}
                  <Avatar className={style.avatar}>
                    <AvatarFallback className="bg-primary/10 font-semibold text-primary">
                      {initials(entry.name)}
                    </AvatarFallback>
                  </Avatar>
                  <p className={cn("mt-3 font-semibold", isFirst ? "text-[15px]" : "text-[13px]")}>
                    {entry.name}
                  </p>
                  <p className={cn("text-[12px] font-bold", style.medal)}>
                    #{entry.rank}
                  </p>
                  <p className="mt-2 text-[15px] font-bold text-coin-dark">
                    🪙 {entry.coins.toLocaleString()}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1 text-[12px] text-muted-foreground">
                    <Award className="h-3.5 w-3.5" aria-hidden="true" />
                    {entry.badges} {tc("badges").toLowerCase()}
                  </p>
                </motion.div>
              );
            })}
          </div>

          {/* ── Ranks 4+ ────────────────────────────────────────── */}
          {rest.length > 0 && (
            <div className="mt-6 overflow-hidden rounded-2xl bg-card shadow-sm">
              <div className="flex items-center gap-4 border-b border-border px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">
                <span className="w-8">{t("rank")}</span>
                <span className="flex-1">{t("name")}</span>
                <span className="w-20 text-right">{t("badgeCount")}</span>
                <span className="w-24 text-right">{t("coins")}</span>
              </div>
              {rest.map((entry) => (
                <div
                  key={entry.id}
                  className={cn(
                    "flex h-[52px] items-center gap-4 border-b border-border/60 px-4 text-[14px] last:border-0",
                    "transition-colors hover:bg-subtle",
                    entry.id === currentUserId && "bg-accent/60"
                  )}
                >
                  <span className="w-8 font-semibold text-muted-foreground">
                    {entry.rank}
                  </span>
                  <span className="flex flex-1 items-center gap-2.5 font-medium">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="bg-primary/10 text-[10px] font-semibold text-primary">
                        {initials(entry.name)}
                      </AvatarFallback>
                    </Avatar>
                    {entry.name}
                  </span>
                  <span className="w-20 text-right text-muted-foreground">
                    {entry.badges}
                  </span>
                  <span className="w-24 text-right font-semibold text-coin-dark">
                    🪙 {entry.coins.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
}
