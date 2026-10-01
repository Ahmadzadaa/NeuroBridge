"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { LargeTitle } from "@/components/ui/ios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { Activity, Brain, CreditCard, Users } from "lucide-react";
import type { BusinessMetrics } from "@/lib/monitoring/metrics-service";

interface SystemDashboardClientProps {
  userName: string;
  title: string;
}

interface HealthStatus {
  status: string;
  checks?: { database: string };
  uptime?: number;
}

export function SystemDashboardClient({
  userName,
  title,
}: SystemDashboardClientProps) {
  const t = useTranslations("superAdmin.system");
  const tPage = useTranslations("superAdmin.pages");
  const [metrics, setMetrics] = useState<BusinessMetrics | null>(null);
  const [health, setHealth] = useState<HealthStatus | null>(null);

  useEffect(() => {
    // The two requests can still be in flight when the operator navigates
    // away; without the guard their responses would land on an unmounted
    // component.
    let cancelled = false;

    async function load() {
      try {
        const [metricsRes, healthRes] = await Promise.all([
          fetch("/api/metrics/business"),
          fetch("/api/health/ready"),
        ]);
        if (cancelled) return;
        if (metricsRes.ok) setMetrics(await metricsRes.json());
        if (healthRes.ok) setHealth(await healthRes.json());
      } catch {
        // The cards already render an em dash when the data never arrives.
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <DashboardLayout panel="super-admin" title={title} userName={userName}>
      <LargeTitle className="mb-6" title={title} subtitle={tPage("systemSubtitle")} />
      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard
          title={t("registrations24h")}
          value={metrics?.registrationRate.last24h ?? "—"}
          icon={Users}
          accent="brand"
        />
        <StatCard
          title={t("paymentFailures24h")}
          value={metrics?.paymentFailures.last24h ?? "—"}
          icon={CreditCard}
          accent="coin"
        />
        <StatCard
          title={t("aiUsage24h")}
          value={metrics?.aiUsage.last24h ?? "—"}
          icon={Brain}
          accent="purple"
        />
        <StatCard
          title={t("seatUtilization")}
          value={metrics ? `${metrics.seatUtilization.platformAverage}%` : "—"}
          icon={Activity}
          accent="success"
        />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>{t("health")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              {t("statusLabel")}:{" "}
              <span
                className={
                  health?.status === "ok" ? "text-emerald-600" : "text-red-600"
                }
              >
                {health?.status ?? t("unknown")}
              </span>
            </p>
            <p>
              {t("databaseLabel")}: {health?.checks?.database ?? t("unknown")}
            </p>
            <p>
              {t("uptimeLabel")}: {health?.uptime ? `${health.uptime}s` : "—"}
            </p>
            <p className="text-muted-foreground">
              {t("metricsUpdated")}:{" "}
              {metrics?.generatedAt
                ? new Date(metrics.generatedAt).toLocaleString()
                : "—"}
            </p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t("registrationRate7d")}</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={metrics?.registrationRate.daily ?? []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="var(--primary)"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("aiUsage7d")}</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics?.aiUsage.daily ?? []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar
                  dataKey="count"
                  fill="var(--chart-2)"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("seatByTenant")}</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={(metrics?.seatUtilization.byTenant ?? []).slice(0, 8)}
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 100]} unit="%" />
                <YAxis
                  type="category"
                  dataKey="tenantName"
                  width={100}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip />
                <Bar
                  dataKey="utilizationPercent"
                  fill="var(--success)"
                  radius={[0, 6, 6, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
