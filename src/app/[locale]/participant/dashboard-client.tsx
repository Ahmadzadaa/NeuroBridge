"use client";

import { useTranslations } from "next-intl";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { EmptyState } from "@/components/ui/empty-state";
import { Coins, Award, FileText, TrendingUp } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

interface ParticipantDashboardClientProps {
  userName: string;
  coinBalance: number;
  badgeCount: number;
  certificateCount: number;
}

export function ParticipantDashboardClient({
  userName,
  coinBalance,
  badgeCount,
  certificateCount,
}: ParticipantDashboardClientProps) {
  const t = useTranslations("participant");
  const tc = useTranslations("common");
  const reducedMotion = useReducedMotion();

  return (
    <DashboardLayout
      panel="participant"
      title={t("title")}
      userName={userName}
      coinBalance={coinBalance}
    >
      <motion.div
        initial={reducedMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 rounded-2xl bg-gradient-to-r from-primary/10 via-chart-2/5 to-coin/10 p-6 shadow-sm"
      >
        <h2 className="text-[22px] font-semibold tracking-[-0.3px]">
          {t("welcome")}, {userName}! 👋
        </h2>
        <p className="mt-1 text-muted-foreground">{t("progress")}</p>
        <ProgressBar value={0} color="brand" className="mt-4 h-3" aria-label={t("progress")} />
      </motion.div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard
          title={t("coinBalance")}
          value={coinBalance}
          icon={Coins}
          accent="coin"
        />
        <StatCard
          title={t("earnedBadges")}
          value={badgeCount}
          icon={Award}
          accent="purple"
        />
        <StatCard
          title={t("myCertificates")}
          value={certificateCount}
          icon={FileText}
          accent="success"
        />
        <StatCard
          title={t("progress")}
          value={0}
          suffix="%"
          icon={TrendingUp}
          accent="brand"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="rounded-2xl border-0 shadow-sm">
          <CardHeader>
            <CardTitle>{t("upcomingTasks")}</CardTitle>
          </CardHeader>
          <CardContent>
            <EmptyState title={tc("noData")} className="py-6" />
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-0 shadow-sm">
          <CardHeader>
            <CardTitle>{t("simulations.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <EmptyState title={tc("noData")} className="py-6" />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
