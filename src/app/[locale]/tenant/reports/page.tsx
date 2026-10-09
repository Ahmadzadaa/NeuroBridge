import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  Bot,
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
import { PAGE_ROWS, ReportBody } from "@/components/reports/report-body";
import { getUniversityReport } from "@/lib/reports/university-service";
import { academicYearLabel, isUniversityReport, UNIVERSITY_REPORTS, type UniversityReportType } from "@/lib/reports/university-types";
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
  aiMentor: { icon: Bot, tone: "violet" },
};

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

  // Year-over-year compares academic years; AI usage is organisation-wide, so neither takes a programme.
  const programScoped = type !== "yoy" && type !== "aiMentor";
  const scope = new URLSearchParams(type === "yoy" ? { a: String(picked[0]), b: String(picked[1]) } : programScoped && programId ? { program: programId } : {});
  const download = (format: "xlsx" | "pdf") => {
    const q = new URLSearchParams(scope);
    q.set("format", format);
    q.set("locale", locale);
    return `/api/reports/university/${type}?${q}`;
  };
  const reportHref = (next: UniversityReportType) => {
    const q = new URLSearchParams(programId && next !== "yoy" && next !== "aiMentor" ? { type: next, program: programId } : { type: next });
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

        <nav aria-label={t("pickReport")} className="grid grid-cols-2 gap-2 sm:grid-cols-3">
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
          {type !== "aiMentor" && (
            <ReportFilters
              type={type}
              programs={programs}
              programId={programId}
              years={available.map((y) => ({ value: y, label: academicYearLabel(y) }))}
              picked={picked}
            />
          )}
        </Reveal>

        <ReportBody
          report={report}
          locale={locale}
          labels={{ noData: t("noData"), moreRows: (total: number) => t("moreRows", { shown: PAGE_ROWS, total }) }}
        />
      </div>
    </DashboardLayout>
  );
}
