"use client";

import { useTranslations } from "next-intl";
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

const growthData = [
  { month: "Oca", revenue: 12000, tenants: 8 },
  { month: "Şub", revenue: 15000, tenants: 10 },
  { month: "Mar", revenue: 18000, tenants: 12 },
  { month: "Nis", revenue: 22000, tenants: 15 },
  { month: "May", revenue: 28000, tenants: 18 },
  { month: "Haz", revenue: 35000, tenants: 22 },
];

interface SuperAdminDashboardProps {
  userName: string;
}

export function SuperAdminDashboard({ userName }: SuperAdminDashboardProps) {
  const t = useTranslations("superAdmin");

  return (
    <DashboardLayout panel="super-admin" title={t("title")} userName={userName}>
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard
          title={t("stats.totalTenants")}
          value={22}
          icon={Building2}
          trend="+4 this month"
          accent="brand"
        />
        <StatCard
          title={t("stats.activeUsers")}
          value={1248}
          icon={Users}
          trend="+12% growth"
          accent="purple"
        />
        <StatCard
          title={t("stats.totalRevenue")}
          value={350000}
          prefix="₺"
          icon={DollarSign}
          trend="+18% vs last month"
          accent="success"
        />
        <StatCard
          title={t("stats.growth")}
          value="+22%"
          icon={TrendingUp}
          trend="Monthly growth rate"
          trendDirection="neutral"
          accent="coin"
        />
      </div>

      <Card className="mt-6 rounded-2xl border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Revenue & Tenant Growth</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={growthData}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
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
