"use client";

import { useTranslations } from "next-intl";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { StatCard } from "@/components/ui/stat-card";
import { Users, FileText, Award, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { ProgressBar } from "@/components/ui/progress-bar";
import { EmptyState } from "@/components/ui/empty-state";

interface TenantDashboardClientProps {
  userName: string;
  seatsUsed: number;
  seatLimit: number;
  programCount: number;
}

export function TenantDashboardClient({
  userName,
  seatsUsed,
  seatLimit,
  programCount,
}: TenantDashboardClientProps) {
  const t = useTranslations("tenant");
  const tc = useTranslations("common");

  const remaining = Math.max(seatLimit - seatsUsed, 0);
  const utilization = seatLimit > 0 ? (seatsUsed / seatLimit) * 100 : 0;

  return (
    <DashboardLayout
      panel="tenant"
      title={t("title")}
      userName={userName}
      seatUsage={{ used: seatsUsed, limit: seatLimit }}
    >
      <Card className="mb-6 rounded-2xl border-0 bg-gradient-to-r from-primary/10 to-chart-2/10 shadow-sm">
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="w-full max-w-xs">
            <h3 className="font-semibold">{t("seats.total")}: {seatLimit}</h3>
            <p className="text-sm text-muted-foreground">
              {t("seats.used")}: {seatsUsed} · {t("seats.remaining")}: {remaining}
            </p>
            <ProgressBar
              value={utilization}
              color="inverse"
              className="mt-2 h-2"
              aria-label={t("seats.used")}
            />
          </div>
          <Link href="/tenant/billing">
            <Button className="rounded-xl">{tc("upgradeSeats")}</Button>
          </Link>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard
          title={t("programs.title")}
          value={programCount}
          icon={FileText}
          accent="brand"
        />
        <StatCard
          title={t("participants.title")}
          value={seatsUsed}
          icon={Users}
          accent="purple"
        />
        <StatCard title={tc("badges")} value={0} icon={Award} accent="coin" />
        <StatCard
          title={t("reports.kpi.simulationCompletion")}
          value={0}
          suffix="%"
          icon={TrendingUp}
          accent="success"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="rounded-2xl border-0 shadow-sm">
          <CardHeader>
            <CardTitle>{t("programs.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <EmptyState
              title={tc("noData")}
              className="py-6"
              action={
                <Link href="/tenant/programs/buy">
                  <Button>{t("programs.buy")}</Button>
                </Link>
              }
            />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
