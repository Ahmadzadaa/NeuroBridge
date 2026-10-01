"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import {
  Gamepad2,
  GraduationCap,
  Hourglass,
  PlayCircle,
  Trophy,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { LargeTitle } from "@/components/ui/ios";
import { cn } from "@/lib/utils";

export interface SimulationItem {
  id: string;
  name: string;
  description: string | null;
  category: string;
  totalRounds: number;
  playable: boolean;
  activeRound: number | null;
  bestScore: number | null;
  teacherGrade: { grade: number; maxGrade: number } | null;
}

interface SimulationsPageClientProps {
  locale: string;
  userName: string;
  coinBalance: number;
  simulations: SimulationItem[];
}

export function SimulationsPageClient({
  locale,
  userName,
  coinBalance,
  simulations,
}: SimulationsPageClientProps) {
  const t = useTranslations("simulation.list");

  return (
    <DashboardLayout
      panel="participant"
      title={t("title")}
      userName={userName}
      coinBalance={coinBalance}
    >
      <LargeTitle className="mb-6" title={t("title")} subtitle={t("subtitle")} />

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {simulations.map((sim, i) => {
          const inner = (
            <div
              className={cn(
                "flex h-full flex-col rounded-[22px] bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)] ring-1 ring-border/60 p-6 ring-1 ring-transparent transition-all duration-200",
                sim.playable
                  ? "hover:-translate-y-0.5 hover:shadow-md hover:ring-primary/20"
                  : "opacity-60"
              )}
            >
              <div className="flex items-start justify-between">
                <div
                  className={cn(
                    "flex h-11 w-11 items-center justify-center rounded-xl",
                    sim.bestScore !== null
                      ? "bg-success/10 text-success"
                      : "bg-primary/10 text-primary"
                  )}
                >
                  {sim.bestScore !== null ? (
                    <Trophy className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <Gamepad2 className="h-5 w-5" aria-hidden="true" />
                  )}
                </div>
                {!sim.playable ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-subtle px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                    <Hourglass className="h-3 w-3" aria-hidden="true" />
                    {t("comingSoon")}
                  </span>
                ) : sim.activeRound !== null ? (
                  <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
                    {t("roundProgress", {
                      current: sim.activeRound,
                      total: sim.totalRounds,
                    })}
                  </span>
                ) : sim.bestScore !== null ? (
                  <span className="inline-flex items-center rounded-full bg-success/10 px-2.5 py-1 text-[11px] font-semibold text-success">
                    {t("completed")}
                  </span>
                ) : null}
              </div>

              <h3 className="mt-4 text-[16px] font-semibold leading-snug">
                {sim.name}
              </h3>
              {sim.description && (
                <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">
                  {sim.description}
                </p>
              )}

              <div className="mt-auto flex items-center justify-between pt-5">
                {sim.playable ? (
                  <span className="flex items-center gap-1.5 text-[13px] font-semibold text-primary">
                    <PlayCircle className="h-4 w-4" aria-hidden="true" />
                    {sim.activeRound !== null
                      ? t("continue")
                      : sim.bestScore !== null
                        ? t("playAgain")
                        : t("start")}
                  </span>
                ) : (
                  <span />
                )}
                <span className="flex items-center gap-3 text-[12px] font-medium text-muted-foreground">
                  {sim.bestScore !== null && (
                    <span>
                      {t("bestScore")}: <strong>{sim.bestScore}</strong>
                    </span>
                  )}
                  {sim.teacherGrade && (
                    <span className="flex items-center gap-1 text-success">
                      <GraduationCap className="h-3.5 w-3.5" aria-hidden="true" />
                      {sim.teacherGrade.grade}/{sim.teacherGrade.maxGrade}
                    </span>
                  )}
                </span>
              </div>
            </div>
          );

          return (
            <motion.div
              key={sim.id}
              style={{ "--i": i } as React.CSSProperties}
            className="ios-reveal"
            >
              {sim.playable ? (
                <Link
                  href={`/${locale}/participant/simulations/${sim.id}`}
                  className="block h-full"
                >
                  {inner}
                </Link>
              ) : (
                inner
              )}
            </motion.div>
          );
        })}
      </div>
    </DashboardLayout>
  );
}
