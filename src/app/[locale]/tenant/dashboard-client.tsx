"use client";

import { useTranslations } from "next-intl";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { StatCard } from "@/components/ui/stat-card";
import { Users, FileText, Award, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { Progress } from "@/components/ui/progress";

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
    <DashboardLayout panel="tenant" title={t("title")} userName={userName}>
      <Card className="mb-6 rounded-2xl border-0 bg-gradient-to-r from-indigo-500/10 to-blue-500/10 shadow-sm">
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-semibold">{t("seats.total")}: {seatLimit}</h3>
            <p className="text-sm text-muted-foreground">
              {t("seats.used")}: {seatsUsed} · {t("seats.remaining")}: {remaining}
            </p>
            <Progress value={utilization} className="mt-2 h-2 w-full max-w-xs" />
          </div>
          <Link href="/tenant/billing">
            <Button className="rounded-xl">{tc("upgradeSeats")}</Button>
          </Link>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title={t("programs.title")} value={programCount} icon={FileText} gradient="from-indigo-500/10 to-purple-500/10" />
        <StatCard title={t("participants.title")} value={seatsUsed} icon={Users} gradient="from-blue-500/10 to-cyan-500/10" />
        <StatCard title={tc("badges")} value={0} icon={Award} gradient="from-amber-500/10 to-orange-500/10" />
        <StatCard title="Completion" value="0%" icon={TrendingUp} gradient="from-emerald-500/10 to-green-500/10" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="rounded-2xl border-0 shadow-sm">
          <CardHeader>
            <CardTitle>{t("programs.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">No programs yet. Create your first program.</p>
            <Link href="/tenant/programs/new">
              <Button className="rounded-xl">{t("programs.create")}</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
