"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Award,
  Download,
  GraduationCap,
  TrendingUp,
  Users,
  UserCheck,
  ArrowUpDown,
} from "lucide-react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { LargeTitle } from "@/components/ui/ios";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/ui/empty-state";
import {
  StatCardGridSkeleton,
  TableSkeleton,
} from "@/components/ui/loading-skeletons";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AnalyticsOverview, CourseBreakdownRow } from "@/lib/analytics/types";

interface Option {
  id: string;
  name: string;
}

interface AnalyticsClientProps {
  userName: string;
  tenantId: string;
  programs: Option[];
  courses: Option[];
}

/** Sentinel for "no filter" — Select cannot hold an empty string value. */
const ALL = "__all__";

type SortKey = keyof Pick<
  CourseBreakdownRow,
  "title" | "enrolled" | "completed" | "completionPercent" | "averageScore" | "averageActiveDays"
>;

export function AnalyticsClient({
  userName,
  tenantId,
  programs,
  courses,
}: AnalyticsClientProps) {
  const t = useTranslations("tenant.analytics");

  const locale = useLocale();

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [programId, setProgramId] = useState(ALL);
  const [courseId, setCourseId] = useState(ALL);

  /**
   * The response is stored together with the filter string it answers, so
   * "loading" is derived rather than toggled. That keeps the effect free of a
   * synchronous setState, and means a stale response can never be mistaken for
   * the current one.
   */
  const [result, setResult] = useState<{
    key: string;
    data: AnalyticsOverview | null;
    failed: boolean;
  } | null>(null);
  const [exporting, setExporting] = useState(false);

  const [sortKey, setSortKey] = useState<SortKey>("enrolled");
  const [sortAsc, setSortAsc] = useState(false);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (from) params.set("from", new Date(from).toISOString());
    if (to) params.set("to", new Date(to).toISOString());
    if (programId !== ALL) params.set("programId", programId);
    if (courseId !== ALL) params.set("courseId", courseId);
    return params.toString();
  }, [from, to, programId, courseId]);

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/tenants/${tenantId}/analytics/overview?${queryString}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Analytics request failed: ${res.status}`);
        return res.json();
      })
      .then((json: AnalyticsOverview) => {
        if (!cancelled) setResult({ key: queryString, data: json, failed: false });
      })
      .catch(() => {
        if (!cancelled) setResult({ key: queryString, data: null, failed: true });
      });

    // A filter changed while a request was in flight: drop the stale response
    // rather than let it overwrite the newer one.
    return () => {
      cancelled = true;
    };
  }, [tenantId, queryString]);

  const loading = result?.key !== queryString;
  const data = result?.data ?? null;
  const failed = result?.failed ?? false;

  const numberFormat = useMemo(() => new Intl.NumberFormat(locale), [locale]);
  const weekFormat = useMemo(
    () => new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }),
    [locale],
  );

  const chartData = useMemo(
    () =>
      (data?.timeSeries ?? []).map((point) => ({
        ...point,
        label: weekFormat.format(new Date(point.weekStart)),
      })),
    [data, weekFormat],
  );

  const sortedCourses = useMemo(() => {
    const rows = [...(data?.courses ?? [])];
    return rows.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      // Courses with no score or no finishers sort last in either direction —
      // "no data yet" is not the same as "zero".
      if (av === null) return 1;
      if (bv === null) return -1;
      const cmp =
        typeof av === "string" && typeof bv === "string"
          ? av.localeCompare(bv)
          : Number(av) - Number(bv);
      return sortAsc ? cmp : -cmp;
    });
  }, [data, sortKey, sortAsc]);

  const toggleSort = useCallback(
    (key: SortKey) => {
      setSortAsc((prev) => (key === sortKey ? !prev : false));
      setSortKey(key);
    },
    [sortKey],
  );

  async function downloadCsv() {
    // The CSV export is a per-programme participant roster, so it needs one
    // programme; the date filters have no counterpart in that endpoint.
    if (programId === ALL) {
      toast.error(t("csvNeedsProgram"));
      return;
    }

    setExporting(true);
    try {
      const res = await fetch("/api/reports/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ programId, format: "csv", reportType: "general" }),
      });

      if (!res.ok) {
        toast.error(t("csvFailed"));
        return;
      }

      if (res.status === 202) {
        toast.message(t("csvQueued"));
        return;
      }

      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition");
      const filename = disposition?.match(/filename="(.+)"/)?.[1] ?? "report.csv";
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
      toast.success(t("csvDownloaded"));
    } catch {
      toast.error(t("csvFailed"));
    } finally {
      setExporting(false);
    }
  }

  const hasCourses = (data?.courses.length ?? 0) > 0;
  // Each chart judges its own emptiness: a cohort can be logging in every week
  // while finishing nothing, and an all-zero bar chart with axes reads as a
  // broken widget rather than as "nobody has completed a course yet".
  const hasActivity = chartData.some(
    (p) => p.activeStudents > 0 || p.lessonsCompleted > 0,
  );
  const hasCompletions = chartData.some((p) => p.coursesCompleted > 0);

  return (
    <DashboardLayout panel="tenant" title={t("title")} userName={userName}>
      <LargeTitle className="mb-6" title={t("title")} subtitle={t("subtitle")} />
      <Card className="mb-6">
        <CardContent className="flex flex-wrap items-end gap-4 p-5">
          <div className="min-w-[150px]">
            <Label htmlFor="analytics-from" className="mb-1.5 block">
              {t("filters.from")}
            </Label>
            <Input
              id="analytics-from"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded-xl"
            />
          </div>

          <div className="min-w-[150px]">
            <Label htmlFor="analytics-to" className="mb-1.5 block">
              {t("filters.to")}
            </Label>
            <Input
              id="analytics-to"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="rounded-xl"
            />
          </div>

          <div className="min-w-[200px]">
            <Label className="mb-1.5 block">{t("filters.program")}</Label>
            <Select value={programId} onValueChange={(v) => setProgramId(v ?? ALL)}>
              <SelectTrigger className="rounded-xl">
                {/* Base UI renders the raw value unless it is given a
                    formatter, which would show a cuid in the trigger. */}
                <SelectValue>
                  {(value: string) =>
                    programs.find((p) => p.id === value)?.name ??
                    t("filters.allPrograms")
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t("filters.allPrograms")}</SelectItem>
                {programs.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-[200px]">
            <Label className="mb-1.5 block">{t("filters.course")}</Label>
            <Select value={courseId} onValueChange={(v) => setCourseId(v ?? ALL)}>
              <SelectTrigger className="rounded-xl">
                <SelectValue>
                  {(value: string) =>
                    courses.find((c) => c.id === value)?.name ??
                    t("filters.allCourses")
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t("filters.allCourses")}</SelectItem>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="outline"
            className="ml-auto rounded-xl"
            disabled={exporting}
            onClick={downloadCsv}
          >
            <Download className="mr-2 h-4 w-4" />
            {t("downloadCsv")}
          </Button>
        </CardContent>
      </Card>

      {loading ? (
        <>
          <StatCardGridSkeleton count={6} />
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <Skeleton className="h-[280px] rounded-2xl" />
            <Skeleton className="h-[280px] rounded-2xl" />
          </div>
          <div className="mt-6">
            <TableSkeleton rows={5} />
          </div>
        </>
      ) : failed || !data ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState title={t("loadFailed")} description={t("loadFailedHint")} />
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Six across only on a genuinely wide screen: at 1440px each card is
              narrow enough that a single long label ("Tamamlanma") breaks
              mid-word. */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 2xl:grid-cols-6">
            <StatCard title={t("kpi.totalStudents")} value={data.kpis.totalStudents} icon={Users} accent="brand" />
            <StatCard title={t("kpi.active7")} value={data.kpis.activeStudents7d} icon={UserCheck} accent="success" />
            <StatCard title={t("kpi.active30")} value={data.kpis.activeStudents30d} icon={UserCheck} accent="success" />
            <StatCard title={t("kpi.enrolments")} value={data.kpis.enrolments} icon={GraduationCap} accent="brand" />
            <StatCard title={t("kpi.completion")} value={data.kpis.averageCompletionPercent} suffix="%" icon={TrendingUp} accent="purple" />
            <StatCard title={t("kpi.certificates")} value={data.kpis.certificatesIssued} icon={Award} accent="coin" />
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t("charts.activity")}</CardTitle>
              </CardHeader>
              <CardContent>
                {hasActivity ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={12} />
                      <YAxis stroke="var(--muted-foreground)" fontSize={12} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{
                          background: "var(--card)",
                          border: "1px solid var(--border)",
                          borderRadius: 12,
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="activeStudents"
                        name={t("charts.activeStudents")}
                        stroke="var(--chart-1)"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="lessonsCompleted"
                        name={t("charts.lessonsCompleted")}
                        stroke="var(--chart-2)"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyState title={t("empty.activity")} description={t("empty.activityHint")} />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("charts.completion")}</CardTitle>
              </CardHeader>
              <CardContent>
                {hasCompletions ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={12} />
                      <YAxis stroke="var(--muted-foreground)" fontSize={12} allowDecimals={false} />
                      <Tooltip
                        cursor={{ fill: "var(--muted)" }}
                        contentStyle={{
                          background: "var(--card)",
                          border: "1px solid var(--border)",
                          borderRadius: 12,
                        }}
                      />
                      <Bar
                        dataKey="coursesCompleted"
                        name={t("charts.coursesCompleted")}
                        fill="var(--chart-1)"
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyState
                    title={t("empty.completions")}
                    description={t("empty.completionsHint")}
                  />
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>{t("courses.title")}</CardTitle>
            </CardHeader>
            <CardContent>
              {hasCourses ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <SortableHead label={t("courses.name")} sortKey="title" active={sortKey} asc={sortAsc} onSort={toggleSort} />
                      <SortableHead label={t("courses.enrolled")} sortKey="enrolled" active={sortKey} asc={sortAsc} onSort={toggleSort} />
                      <SortableHead label={t("courses.completed")} sortKey="completed" active={sortKey} asc={sortAsc} onSort={toggleSort} />
                      <SortableHead label={t("courses.completionRate")} sortKey="completionPercent" active={sortKey} asc={sortAsc} onSort={toggleSort} />
                      <SortableHead label={t("courses.averageScore")} sortKey="averageScore" active={sortKey} asc={sortAsc} onSort={toggleSort} />
                      <SortableHead label={t("courses.activeDays")} sortKey="averageActiveDays" active={sortKey} asc={sortAsc} onSort={toggleSort} />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedCourses.map((course) => (
                      <TableRow key={course.courseId}>
                        <TableCell className="font-medium">{course.title}</TableCell>
                        <TableCell>{numberFormat.format(course.enrolled)}</TableCell>
                        <TableCell>{numberFormat.format(course.completed)}</TableCell>
                        <TableCell>{course.completionPercent}%</TableCell>
                        <TableCell>
                          {course.averageScore === null ? "—" : course.averageScore}
                        </TableCell>
                        <TableCell>
                          {course.averageActiveDays === null
                            ? "—"
                            : t("courses.days", { count: course.averageActiveDays })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <EmptyState title={t("empty.courses")} description={t("empty.coursesHint")} />
              )}
            </CardContent>
          </Card>

          {/* States plainly that "average days" is an elapsed span, not time
              spent — the data model records no start timestamps. */}
          <p className="mt-4 text-[12px] text-muted-foreground">
            {data.meta.cached ? t("cachedNote") : t("liveNote")} · {t("durationNote")}
          </p>
        </>
      )}
    </DashboardLayout>
  );
}

function SortableHead({
  label,
  sortKey,
  active,
  asc,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  active: SortKey;
  asc: boolean;
  onSort: (key: SortKey) => void;
}) {
  const isActive = active === sortKey;
  return (
    // aria-sort belongs on the column header itself, not on the button inside
    // it — the button role does not support the attribute.
    <TableHead aria-sort={isActive ? (asc ? "ascending" : "descending") : "none"}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="inline-flex items-center gap-1 hover:text-foreground"
      >
        {label}
        <ArrowUpDown
          className={isActive ? "h-3.5 w-3.5 text-foreground" : "h-3.5 w-3.5 opacity-40"}
          aria-hidden="true"
        />
      </button>
    </TableHead>
  );
}
