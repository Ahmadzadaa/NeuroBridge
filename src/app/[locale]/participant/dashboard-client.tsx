"use client";

import { useTranslations } from "next-intl";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Coins, Award, FileText, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

interface ParticipantDashboardClientProps {
  userName: string;
}

export function ParticipantDashboardClient({ userName }: ParticipantDashboardClientProps) {
  const t = useTranslations("participant");
  const tc = useTranslations("common");

  return (
    <DashboardLayout panel="participant" title={t("title")} userName={userName}>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 rounded-2xl bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-amber-500/10 p-6 shadow-sm"
      >
        <h2 className="text-xl font-semibold">{t("welcome")}, {userName}! 👋</h2>
        <p className="mt-1 text-muted-foreground">{t("progress")}</p>
        <Progress value={0} className="mt-4 h-3 rounded-full" />
      </motion.div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title={t("coinBalance")}
          value={0}
          icon={Coins}
          gradient="from-amber-500/10 to-yellow-500/10"
        />
        <StatCard
          title={t("earnedBadges")}
          value={0}
          icon={Award}
          gradient="from-purple-500/10 to-indigo-500/10"
        />
        <StatCard
          title={t("myCertificates")}
          value={0}
          icon={FileText}
          gradient="from-emerald-500/10 to-green-500/10"
        />
        <StatCard
          title={t("progress")}
          value="0%"
          icon={TrendingUp}
          gradient="from-blue-500/10 to-cyan-500/10"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="rounded-2xl border-0 shadow-sm">
          <CardHeader>
            <CardTitle>{t("upcomingTasks")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{tc("noData")}</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-0 shadow-sm">
          <CardHeader>
            <CardTitle>{t("simulations.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{tc("noData")}</p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
