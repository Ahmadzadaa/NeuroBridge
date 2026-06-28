"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
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

export function SystemDashboardClient({ userName, title }: SystemDashboardClientProps) {
  const [metrics, setMetrics] = useState<BusinessMetrics | null>(null);
  const [health, setHealth] = useState<HealthStatus | null>(null);

  useEffect(() => {
    async function load() {
      const [metricsRes, healthRes] = await Promise.all([
        fetch("/api/metrics/business"),
        fetch("/api/health/ready"),
      ]);
      if (metricsRes.ok) setMetrics(await metricsRes.json());
      if (healthRes.ok) setHealth(await healthRes.json());
    }
    load();
  }, []);

  return (
    <DashboardLayout panel="super-admin" title={title} userName={userName}>
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Registrations (24h)"
          value={metrics?.registrationRate.last24h ?? "—"}
          icon={Users}
          gradient="from-indigo-500/10 to-purple-500/10"
        />
        <StatCard
          title="Payment failures (24h)"
          value={metrics?.paymentFailures.last24h ?? "—"}
          icon={CreditCard}
          gradient="from-red-500/10 to-orange-500/10"
        />
        <StatCard
          title="AI usage (24h)"
          value={metrics?.aiUsage.last24h ?? "—"}
          icon={Brain}
          gradient="from-blue-500/10 to-cyan-500/10"
        />
        <StatCard
          title="Seat utilization"
          value={metrics ? `${metrics.seatUtilization.platformAverage}%` : "—"}
          icon={Activity}
          gradient="from-emerald-500/10 to-green-500/10"
        />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="rounded-2xl border-0 shadow-sm lg:col-span-1">
          <CardHeader>
            <CardTitle>System health</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              Status:{" "}
              <span className={health?.status === "ok" ? "text-emerald-600" : "text-red-600"}>
                {health?.status ?? "unknown"}
              </span>
            </p>
            <p>Database: {health?.checks?.database ?? "unknown"}</p>
            <p>Uptime: {health?.uptime ? `${health.uptime}s` : "—"}</p>
            <p className="text-muted-foreground">
              Metrics updated: {metrics?.generatedAt ? new Date(metrics.generatedAt).toLocaleString() : "—"}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-0 shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle>Registration rate (7 days)</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={metrics?.registrationRate.daily ?? []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="rounded-2xl border-0 shadow-sm">
          <CardHeader>
            <CardTitle>AI usage (7 days)</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics?.aiUsage.daily ?? []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Seat utilization by tenant</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={(metrics?.seatUtilization.byTenant ?? []).slice(0, 8)}
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 100]} unit="%" />
                <YAxis type="category" dataKey="tenantName" width={100} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="utilizationPercent" fill="#10b981" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
