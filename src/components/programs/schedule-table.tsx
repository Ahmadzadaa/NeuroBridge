import { getTranslations } from "next-intl/server";
import type { ScheduleItem } from "@/lib/programs/schedule";
import { PROGRAM_WEEKS } from "@/lib/programs/schedule";
import { formatDate } from "@/lib/format-date";


/** The 6-week plan as a table: one row per week, the jury day called out. */
export async function ScheduleTable({ items, locale }: { items: ScheduleItem[]; locale: string }) {
  const t = await getTranslations("programSchedule");
  // UTC: schedule dates are calendar days stored at UTC midnight.
  const fmt = { format: (value: Date | string) => formatDate(value, locale, "dayMonth") };
  const fmtLong = { format: (value: Date | string) => formatDate(value, locale, "weekdayLong") };

  const weeks = PROGRAM_WEEKS.map((_, i) => items.filter((item) => item.week === i + 1));
  const jury = items.find((i) => i.activity === "JURY_PRESENTATION");

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">{t("caption")}</caption>
        <thead>
          <tr className="border-b border-border text-xs text-muted-foreground">
            <th scope="col" className="py-2 pr-4 font-medium">{t("week")}</th>
            <th scope="col" className="py-2 pr-4 font-medium">{t("dates")}</th>
            <th scope="col" className="py-2 font-medium">{t("content")}</th>
          </tr>
        </thead>
        <tbody>
          {weeks.map((weekItems, i) => {
            const range = weekItems.find((w) => w.activity !== "JURY_PRESENTATION") ?? weekItems[0];
            if (!range) return null;
            return (
              <tr key={i} className="border-b border-border align-top last:border-0">
                <th scope="row" className="whitespace-nowrap py-3 pr-4 font-medium text-foreground">
                  {t("weekN", { n: i + 1 })}
                </th>
                <td className="whitespace-nowrap py-3 pr-4 tabular-nums text-muted-foreground">
                  {fmt.format(range.startsOn)} – {fmt.format(range.endsOn)}
                </td>
                <td className="py-3 text-foreground">
                  {weekItems.map((w) => t(`activities.${w.activity}`)).join(" + ")}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {jury && (
        <p className="mt-3 text-sm text-muted-foreground">
          {t("juryDay", { date: fmtLong.format(jury.startsOn) })}
        </p>
      )}
    </div>
  );
}
