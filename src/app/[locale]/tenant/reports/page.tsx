import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  BarChart3,
  Brain,
  CalendarRange,
  Download,
  FileText,
  Gamepad2,
  GraduationCap,
  LayoutDashboard,
  Rocket,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";
import { requireRole } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { Link } from "@/i18n/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { IconTile, LargeTitle, Reveal, type IconTone } from "@/components/ui/ios";
import { MetricGrid, MetricTile, SectionHeader } from "@/components/dashboard/dashboard-kit";
import { getUniversityReport } from "@/lib/reports/university-service";
import { formatReportValue } from "@/lib/reports/report-format";
import { academicYearLabel, isUniversityReport, UNIVERSITY_REPORTS, type ReportBars, type ReportTable, type UniversityReportType } from "@/lib/reports/university-types";
import { cn } from "@/lib/utils";
import { ReportFilters } from "./report-filters";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const REPORT_META: Record<UniversityReportType, { icon: LucideIcon; tone: IconTone }> = {
  general: { icon: LayoutDashboard, tone: "indigo" },
  participation: { icon: Users, tone: "sky" },
  training: { icon: GraduationCap, tone: "emerald" },
  competency: { icon: Brain, tone: "violet" },
  simulation: { icon: Gamepad2, tone: "amber" },
  hackathon: { icon: Rocket, tone: "rose" },
  development: { icon: TrendingUp, tone: "fuchsia" },
  yoy: { icon: CalendarRange, tone: "slate" },
};

const TILE_TONES: IconTone[] = ["indigo", "emerald", "sky", "violet", "amber", "rose", "fuchsia", "slate"];
/** Two series at most: the comparison years. Indigo and teal stay apart for colour-blind readers. */
const SERIES = ["bg-indigo-500", "bg-teal-500"];
const PAGE_ROWS = 100;
const CARD = "rounded-[22px] bg-card ring-1 ring-border/60 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)]";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "tenant.reports" });
  return { title: `${t("title")} · BizSim` };
}

export default async function ReportsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireRole(locale, ["TENANT_ADMIN", "TENANT_VIEWER"]);
  const tenantId = session.user.tenantId;
  if (!tenantId) redirect(`/${locale}/tenant`);

  const sp = await searchParams;
  const one = (key: string) => (typeof sp[key] === "string" ? (sp[key] as string) : undefined);
  const requested = one("type");
  const type: UniversityReportType = isUniversityReport(requested) ? requested : "general";

  const programs = await prisma.program.findMany({
    where: { tenantId },
    select: { id: true, name: true },
    orderBy: { createdAt: "desc" },
  });
  const programId = programs.some((p) => p.id === one("program")) ? one("program")! : null;
  const a = Number(one("a"));
  const b = Number(one("b"));
  const years: [number, number] | null = Number.isInteger(a) && Number.isInteger(b) && a !== b ? [Math.min(a, b), Math.max(a, b)] : null;

  const [{ report, years: available, picked }, t] = await Promise.all([
    getUniversityReport({ tenantId, type, locale, programId, years }),
    getTranslations("tenant.reports"),
  ]);

  const scope = new URLSearchParams(type === "yoy" ? { a: String(picked[0]), b: String(picked[1]) } : programId ? { program: programId } : {});
  const download = (format: "xlsx" | "pdf") => {
    const q = new URLSearchParams(scope);
    q.set("format", format);
    q.set("locale", locale);
    return `/api/reports/university/${type}?${q}`;
  };
  const reportHref = (next: UniversityReportType) => {
    const q = new URLSearchParams(programId && next !== "yoy" ? { type: next, program: programId } : { type: next });
    return `/tenant/reports?${q}`;
  };

  return (
    <DashboardLayout panel="tenant" title={t("title")} userName={session.user.name ?? ""}>
      <div className="space-y-6">
        <LargeTitle
          title={t("title")}
          subtitle={t("subtitle")}
          actions={
            <>
              <a href={download("xlsx")} download className="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-4 text-[14px] font-semibold text-primary-foreground shadow-sm transition-transform active:scale-95">
                <Download className="h-4 w-4" aria-hidden="true" />
                {t("exportExcel")}
              </a>
              <a href={download("pdf")} download className="inline-flex h-10 items-center gap-2 rounded-full bg-card px-4 text-[14px] font-semibold text-foreground ring-1 ring-border transition-transform active:scale-95">
                <FileText className="h-4 w-4" aria-hidden="true" />
                {t("exportPdf")}
              </a>
            </>
          }
        />

        <nav aria-label={t("pickReport")} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {UNIVERSITY_REPORTS.map((key, i) => {
            const meta = REPORT_META[key];
            const active = key === type;
            return (
              <Link
                key={key}
                href={reportHref(key)}
                aria-current={active ? "page" : undefined}
                style={{ "--i": i } as CSSProperties}
                className={cn(
                  "ios-reveal flex min-w-0 items-center gap-3 rounded-2xl p-3 text-left transition-colors",
                  active ? "bg-primary/10 ring-2 ring-primary/40" : "bg-card ring-1 ring-border/60 hover:bg-muted/50"
                )}
              >
                <IconTile icon={meta.icon} tone={meta.tone} size="sm" />
                <span className="min-w-0 text-[13px] font-semibold leading-tight text-foreground">
                  <span className="text-muted-foreground tabular-nums">{i + 1}. </span>
                  {t(`types.${key}.title`)}
                </span>
              </Link>
            );
          })}
        </nav>

        <Reveal index={1} className={cn(CARD, "flex flex-wrap items-end justify-between gap-4 p-4 sm:p-5")}>
          <div className="min-w-0 max-w-2xl">
            <h2 className="text-[20px] font-bold tracking-[-0.4px]">{report.title}</h2>
            <p className="mt-1 text-[14px] leading-relaxed text-muted-foreground">{report.description}</p>
          </div>
          <ReportFilters
            type={type}
            programs={programs}
            programId={programId}
            years={available.map((y) => ({ value: y, label: academicYearLabel(y) }))}
            picked={picked}
          />
        </Reveal>

        {report.kpis.length > 0 && (
          <MetricGrid>
            {report.kpis.map((k, i) => (
              <MetricTile key={k.key} index={i} icon={BarChart3} tone={TILE_TONES[i % TILE_TONES.length]} label={k.label} value={formatReportValue(k.value, k.kind, locale)} />
            ))}
          </MetricGrid>
        )}

        {report.bars.map((chart) => (
          <section key={chart.id} className={cn(CARD, "p-4 sm:p-5")}>
            <SectionHeader title={chart.title} />
            <Bars chart={chart} locale={locale} noData={t("noData")} />
          </section>
        ))}

        {report.tables.map((table) => (
          <section key={table.id}>
            <SectionHeader title={table.title} />
            <DataTable table={table} locale={locale} noData={t("noData")} more={t("moreRows", { shown: PAGE_ROWS, total: table.rows.length })} />
          </section>
        ))}

        {report.notes.length > 0 && (
          <ul className="space-y-1 px-1 text-[12px] leading-relaxed text-muted-foreground">
            {report.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        )}
      </div>
    </DashboardLayout>
  );
}

function Bars({ chart, locale, noData }: { chart: ReportBars; locale: string; noData: string }) {
  if (chart.items.length === 0) return <p className="py-6 text-center text-[14px] text-muted-foreground">{noData}</p>;
  return (
    <div className="space-y-3">
      {chart.series.length > 1 && (
        <ul className="flex flex-wrap gap-4 text-[12px] text-muted-foreground">
          {chart.series.map((s, i) => (
            <li key={s} className="flex items-center gap-1.5">
              <span className={cn("h-2.5 w-2.5 rounded-full", SERIES[i])} aria-hidden="true" />
              {s}
            </li>
          ))}
        </ul>
      )}
      {chart.items.map((item) => (
        <div key={item.label} className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)] items-center gap-3 sm:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]">
          <span className="truncate text-[13px] text-foreground" title={item.label}>
            {item.label}
          </span>
          <div className="space-y-1">
            {item.values.map((v, i) => {
              const text = formatReportValue(v, "percent", locale);
              return (
                <div key={i} className="flex items-center gap-2" title={chart.series.length > 1 ? `${chart.series[i]}: ${text}` : text}>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <div className={cn("bar-fill h-full rounded-full", SERIES[i])} style={{ width: `${Math.min(100, v ?? 0)}%` }} />
                  </div>
                  <span className="w-14 shrink-0 text-right text-[12px] tabular-nums text-muted-foreground">{text}</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function DataTable({ table, locale, noData, more }: { table: ReportTable; locale: string; noData: string; more: string }) {
  const numeric = (kind: string) => kind !== "text" && kind !== "date";
  return (
    <div className={cn(CARD, "overflow-hidden")}>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border/60 text-[12px] font-semibold text-muted-foreground">
              {table.columns.map((c) => (
                <th key={c.key} scope="col" className={cn("whitespace-nowrap px-4 py-3", numeric(c.kind) && "text-right")}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.length === 0 ? (
              <tr>
                <td colSpan={table.columns.length} className="px-4 py-10 text-center text-[14px] text-muted-foreground">
                  {noData}
                </td>
              </tr>
            ) : (
              table.rows.slice(0, PAGE_ROWS).map((row, r) => (
                <tr key={r} className="border-b border-border/60 last:border-0 hover:bg-muted/40">
                  {table.columns.map((c, i) => (
                    <td key={c.key} className={cn("px-4 py-2.5", numeric(c.kind) ? "text-right tabular-nums" : "min-w-[8rem]", i === 0 && "font-medium text-foreground")}>
                      {formatReportValue(row[c.key] ?? null, c.kind, locale)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {table.rows.length > PAGE_ROWS && <p className="border-t border-border/60 px-4 py-2.5 text-[12px] text-muted-foreground">{more}</p>}
      {table.note && <p className="border-t border-border/60 px-4 py-2.5 text-[12px] text-muted-foreground">{table.note}</p>}
    </div>
  );
}
