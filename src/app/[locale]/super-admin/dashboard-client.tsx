"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { StatCard } from "@/components/ui/stat-card";
import { Building2, Users, DollarSign, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

/** Demo series for the growth chart; the month labels are added per locale. */
const growthSeries = [
  { revenue: 12000, tenants: 8 },
  { revenue: 15000, tenants: 10 },
  { revenue: 18000, tenants: 12 },
  { revenue: 22000, tenants: 15 },
  { revenue: 28000, tenants: 18 },
  { revenue: 35000, tenants: 22 },
];

interface SuperAdminDashboardProps {
  userName: string;
}

export function SuperAdminDashboard({ userName }: SuperAdminDashboardProps) {
  const t = useTranslations("superAdmin");
  const locale = useLocale();

  // The labels used to be a fixed Turkish list, so an English or Azerbaijani
  // viewer saw "Oca, Şub, Mar" in the middle of their own language.
  const growthData = useMemo(() => {
    const format = new Intl.DateTimeFormat(locale, { month: "short" });
    const now = new Date();
    return growthSeries.map((point, i) => ({
      ...point,
      month: format.format(
        new Date(
          now.getFullYear(),
          now.getMonth() - (growthSeries.length - 1 - i),
          1,
        ),
      ),
    }));
  }, [locale]);

  return (
    <DashboardLayout panel="super-admin" title={t("title")} userName={userName}>
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard
          title={t("stats.totalTenants")}
          value={22}
          icon={Building2}
          trend={t("trends.newTenants")}
          accent="brand"
        />
        <StatCard
          title={t("stats.activeUsers")}
          value={1248}
          icon={Users}
          trend={t("trends.userGrowth")}
          accent="purple"
        />
        <StatCard
          title={t("stats.totalRevenue")}
          value={350000}
          prefix="₺"
          icon={DollarSign}
          trend={t("trends.revenueVsLastMonth")}
          accent="success"
        />
        <StatCard
          title={t("stats.growth")}
          value="+22%"
          icon={TrendingUp}
          trend={t("trends.monthlyGrowth")}
          trendDirection="neutral"
          accent="coin"
        />
      </div>

      <Card className="mt-6 rounded-2xl border-0 shadow-sm">
        <CardHeader>
          <CardTitle>{t("growthChart")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={growthData}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--primary)"
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--primary)"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-border/50"
              />
              <XAxis dataKey="month" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="var(--primary)"
                fillOpacity={1}
                fill="url(#colorRevenue)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
