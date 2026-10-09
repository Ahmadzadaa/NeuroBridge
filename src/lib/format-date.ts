/**
 * Calendar dates in the reader's language, identical on the server and in
 * the browser.
 *
 * Azerbaijani month names are spelled out here rather than taken from Intl:
 * Node and browsers ship different ICU data for `az`, so an Intl-formatted
 * date could differ between the server render and hydration. Falling back to
 * Turkish formatting avoided that, but showed Turkish month names ("Ekim") on
 * Azerbaijani pages. Dates are read in UTC, the way they are stored.
 */

export type DateStyle = "long" | "medium" | "dayMonth" | "weekdayLong" | "monthShort";

const AZ_MONTHS = ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avqust", "sentyabr", "oktyabr", "noyabr", "dekabr"];
const AZ_MONTHS_SHORT = ["yan", "fev", "mar", "apr", "may", "iyn", "iyl", "avq", "sen", "okt", "noy", "dek"];
const AZ_WEEKDAYS = ["bazar", "bazar ertəsi", "çərşənbə axşamı", "çərşənbə", "cümə axşamı", "cümə", "şənbə"];

const INTL_OPTIONS: Record<DateStyle, Intl.DateTimeFormatOptions> = {
  long: { day: "numeric", month: "long", year: "numeric" },
  medium: { day: "numeric", month: "short", year: "numeric" },
  dayMonth: { day: "numeric", month: "short" },
  weekdayLong: { weekday: "long", day: "numeric", month: "long" },
  monthShort: { month: "short" },
};

function formatAz(d: Date, style: DateStyle): string {
  const day = d.getUTCDate();
  const month = d.getUTCMonth();
  const year = d.getUTCFullYear();
  switch (style) {
    case "long":
      return `${day} ${AZ_MONTHS[month]} ${year}`;
    case "medium":
      return `${day} ${AZ_MONTHS_SHORT[month]} ${year}`;
    case "dayMonth":
      return `${day} ${AZ_MONTHS_SHORT[month]}`;
    case "weekdayLong":
      return `${day} ${AZ_MONTHS[month]}, ${AZ_WEEKDAYS[d.getUTCDay()]}`;
    case "monthShort":
      return AZ_MONTHS_SHORT[month];
  }
}

export function formatDate(value: Date | string, locale: string, style: DateStyle = "medium"): string {
  const d = typeof value === "string" ? new Date(value) : value;
  if (locale === "az") return formatAz(d, style);
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "tr-TR", { ...INTL_OPTIONS[style], timeZone: "UTC" }).format(d);
}
