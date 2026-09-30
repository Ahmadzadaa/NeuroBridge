/**
 * Picks the locale-specific variant of a trilingual DB field
 * (e.g. titleTr / titleEn / titleAz) with sensible fallbacks.
 */
export function localized(
  record: Record<string, unknown>,
  base: string,
  locale: string
): string {
  const suffix = locale === "az" ? "Az" : locale === "en" ? "En" : "Tr";
  const value =
    record[`${base}${suffix}`] ??
    record[`${base}Az`] ??
    record[`${base}Tr`] ??
    record[`${base}En`] ??
    record[base];
  return typeof value === "string" ? value : "";
}

type TextLocale = "az" | "tr" | "en";
const TEXT_FALLBACK: TextLocale[] = ["az", "tr", "en"];

/** Encodes one text in several languages for a single TEXT column. */
export function trilingual(values: Partial<Record<TextLocale, string>>): string {
  return JSON.stringify(values);
}

/**
 * Reads a TEXT column that holds either plain text (e.g. a scenario a teacher
 * wrote in one language) or a trilingual JSON object from `trilingual()`, and
 * returns the reader's language with fallbacks. Plain text passes through.
 */
export function localizedText(value: string | null | undefined, locale: string): string {
  if (!value) return "";
  if (!value.startsWith("{")) return value;
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    const pick = [locale, ...TEXT_FALLBACK].map((l) => parsed[l]).find((v) => typeof v === "string" && v);
    return typeof pick === "string" ? pick : value;
  } catch {
    return value;
  }
}
