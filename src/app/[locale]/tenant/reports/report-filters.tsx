"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { UniversityReportType } from "@/lib/reports/university-types";

const ALL = "all";

/** Programme scope, or the two academic years for the comparison report. Changes are kept in the URL. */
export function ReportFilters({
  type,
  programs,
  programId,
  years,
  picked,
}: {
  type: UniversityReportType;
  programs: { id: string; name: string }[];
  programId: string | null;
  years: { value: number; label: string }[];
  picked: [number, number];
}) {
  const t = useTranslations("tenant.reports");
  const router = useRouter();
  const go = (query: Record<string, string>) => router.push(`/tenant/reports?${new URLSearchParams({ type, ...query })}`);

  if (type === "yoy") {
    const label = (y: number) => years.find((x) => x.value === y)?.label ?? String(y);
    const yearSelect = (value: number, other: number, onPick: (y: number) => void, aria: string) => (
      <Select value={String(value)} onValueChange={(v) => v && onPick(Number(v))}>
        <SelectTrigger aria-label={aria} className="w-32 rounded-xl">
          <SelectValue>{(v: string) => label(Number(v))}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {years.map((y) => (
            <SelectItem key={y.value} value={String(y.value)} disabled={y.value === other}>
              {y.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
    if (years.length < 2) return <p className="text-[13px] text-muted-foreground">{t("needTwoYears")}</p>;
    return (
      <div className="flex flex-wrap items-center gap-2">
        {yearSelect(picked[0], picked[1], (y) => go({ a: String(y), b: String(picked[1]) }), t("yearA"))}
        <span className="text-[13px] text-muted-foreground">{t("versus")}</span>
        {yearSelect(picked[1], picked[0], (y) => go({ a: String(picked[0]), b: String(y) }), t("yearB"))}
      </div>
    );
  }

  return (
    <Select value={programId ?? ALL} onValueChange={(v) => go(v && v !== ALL ? { program: v } : {})}>
      <SelectTrigger aria-label={t("selectProgram")} className="w-full rounded-xl sm:w-72">
        <SelectValue>{(v: string) => programs.find((p) => p.id === v)?.name ?? t("allPrograms")}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{t("allPrograms")}</SelectItem>
        {programs.map((p) => (
          <SelectItem key={p.id} value={p.id}>
            {p.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
