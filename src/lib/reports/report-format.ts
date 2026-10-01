import { formatDate } from "@/lib/format-date";
import type { Cell, ValueKind } from "@/lib/reports/university-types";

const numberLocale = (locale: string) => (locale === "en" ? "en-GB" : "tr-TR");

/** One display rule for the page, the PDF and the Excel summary sheet. */
export function formatReportValue(value: Cell, kind: ValueKind, locale: string): string {
  if (value === null || value === "") return "—";
  if (typeof value === "string") return kind === "date" ? formatDate(value, locale, "medium") : value;
  if (kind === "usd") return `$${value.toLocaleString(numberLocale(locale), { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
  const n = value.toLocaleString(numberLocale(locale), { maximumFractionDigits: 1 });
  return kind === "percent" ? `${n}%` : n;
}
