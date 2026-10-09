/**
 * The university's eight reports share one shape, so the page, the Excel file
 * and the PDF are three renderings of the same object.
 */

export const UNIVERSITY_REPORTS = [
  "general",
  "participation",
  "training",
  "competency",
  "simulation",
  "hackathon",
  "development",
  "yoy",
  "aiMentor",
] as const;

export type UniversityReportType = (typeof UNIVERSITY_REPORTS)[number];

export function isUniversityReport(value: string | null | undefined): value is UniversityReportType {
  return (UNIVERSITY_REPORTS as readonly string[]).includes(value ?? "");
}

export type Cell = string | number | null;

/** How a value is shown: percents and scores are 0–100 with one decimal, dates are ISO days, usd up to four decimals. */
export type ValueKind = "text" | "number" | "percent" | "score" | "date" | "usd";

export interface ReportColumn {
  key: string;
  label: string;
  kind: ValueKind;
}

export interface ReportTable {
  id: string;
  title: string;
  columns: ReportColumn[];
  rows: Record<string, Cell>[];
  note?: string;
}

export interface ReportKpi {
  key: string;
  label: string;
  value: number | null;
  kind: ValueKind;
}

/** Horizontal bars on a 0–100 scale; one value per series. */
export interface ReportBars {
  id: string;
  title: string;
  series: string[];
  items: { label: string; values: (number | null)[] }[];
}

export interface UniversityReport {
  type: UniversityReportType;
  title: string;
  description: string;
  scope: string;
  kpis: ReportKpi[];
  bars: ReportBars[];
  tables: ReportTable[];
  notes: string[];
}

export type Translate = (key: string, values?: Record<string, string | number>) => string;

/**
 * Academic years run September to August and are named by their first
 * calendar year: 15 Oct 2025 and 3 Mar 2026 both belong to 2025 ("2025–26").
 */
export function academicYearOf(date: Date): number {
  const year = date.getUTCFullYear();
  return date.getUTCMonth() >= 8 ? year : year - 1;
}

export function academicYearLabel(startYear: number): string {
  return `${startYear}–${String((startYear + 1) % 100).padStart(2, "0")}`;
}
