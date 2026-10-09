import { BarChart3 } from "lucide-react";
import type { IconTone } from "@/components/ui/ios";
import { MetricGrid, MetricTile, SectionHeader } from "@/components/dashboard/dashboard-kit";
import { formatReportValue } from "@/lib/reports/report-format";
import type { ReportBars, ReportTable, UniversityReport } from "@/lib/reports/university-types";
import { cn } from "@/lib/utils";

/** KPIs, bar charts, tables and notes of one report. Server-safe. */

const TILE_TONES: IconTone[] = ["indigo", "emerald", "sky", "violet", "amber", "rose", "fuchsia", "slate"];
/** Two series at most: the comparison years. Indigo and teal stay apart for colour-blind readers. */
const SERIES = ["bg-indigo-500", "bg-teal-500"];
export const PAGE_ROWS = 100;
const CARD = "rounded-[22px] bg-card ring-1 ring-border/60 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)]";

export function ReportBody({
  report,
  locale,
  labels,
}: {
  report: UniversityReport;
  locale: string;
  labels: { noData: string; moreRows: (total: number) => string };
}) {
  return (
    <>
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
        <Bars chart={chart} locale={locale} noData={labels.noData} />
      </section>
    ))}

    {report.tables.map((table) => (
      <section key={table.id}>
        <SectionHeader title={table.title} />
        <DataTable table={table} locale={locale} noData={labels.noData} more={labels.moreRows(table.rows.length)} />
      </section>
    ))}

    {report.notes.length > 0 && (
      <ul className="space-y-1 px-1 text-[12px] leading-relaxed text-muted-foreground">
        {report.notes.map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
    )}
    </>
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
