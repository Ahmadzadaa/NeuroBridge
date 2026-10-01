import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format-date";
import { loadReportDataset } from "@/lib/reports/university-dataset";
import { availableYears, buildUniversityReport, defaultYears } from "@/lib/reports/university-reports";
import { formatReportValue } from "@/lib/reports/report-format";
import { renderReportPdf } from "@/lib/reports/report-pdf";
import { buildXlsx, type XlsxCell, type XlsxSheet } from "@/lib/reports/xlsx";
import type { Translate, UniversityReport, UniversityReportType } from "@/lib/reports/university-types";

export class ReportScopeError extends Error {
  readonly statusCode = 404;
  readonly code = "PROGRAM_NOT_FOUND";
}

/**
 * Loads and builds one report for a tenant. A programme from another tenant
 * is refused rather than silently widened to "all programmes". The
 * year-over-year report always spans the whole university.
 */
export async function getUniversityReport(params: {
  tenantId: string;
  type: UniversityReportType;
  locale: string;
  programId?: string | null;
  years?: [number, number] | null;
  now?: Date;
}) {
  const t = (await getTranslations({ locale: params.locale, namespace: "tenant.reports" })) as unknown as Translate;
  const programId = params.type === "yoy" ? null : (params.programId ?? null);

  const program = programId
    ? await prisma.program.findFirst({ where: { id: programId, tenantId: params.tenantId }, select: { name: true } })
    : null;
  if (programId && !program) throw new ReportScopeError("Program not found");

  const ds = await loadReportDataset(params.tenantId, params.locale, programId, params.now);
  const years = availableYears(ds);
  const picked = params.years && params.years[0] !== params.years[1] ? params.years : defaultYears(years);
  const report = buildUniversityReport(params.type, ds, {
    t,
    scope: program?.name ?? t("allPrograms"),
    years: picked,
  });
  return { report, years, picked, t };
}

export async function exportUniversityReport(report: UniversityReport, format: "xlsx" | "pdf", locale: string, t: Translate, now = new Date()) {
  const generated = t("generatedOn", { date: formatDate(now, locale, "long") });
  const filename = `bizsim_${report.type}_report_${now.toISOString().slice(0, 10)}.${format}`;

  if (format === "pdf") {
    return { body: await renderReportPdf(report, locale, generated), filename, contentType: "application/pdf" };
  }

  const summary: XlsxSheet = {
    name: t("summarySheet"),
    rows: [
      [report.title],
      [report.description],
      [report.scope],
      [generated],
      [],
      ...report.kpis.map((k): XlsxCell[] => [k.label, k.value, k.kind === "percent" ? "%" : null]),
      [],
      ...report.notes.map((n): XlsxCell[] => [n]),
    ],
    boldRows: [0],
    widths: [48, 16, 6],
  };
  const tables: XlsxSheet[] = report.tables.map((table) => ({
    name: table.title,
    rows: [
      table.columns.map((c) => (c.kind === "percent" ? `${c.label} (%)` : c.label)),
      ...table.rows.map((row) =>
        table.columns.map((c) => {
          const v = row[c.key] ?? null;
          return c.kind === "date" ? formatReportValue(v, "date", locale) : v;
        })
      ),
    ],
    boldRows: [0],
    widths: table.columns.map((c) => (c.kind === "text" ? 28 : 14)),
  }));

  return {
    body: buildXlsx([summary, ...tables]),
    filename,
    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  };
}
