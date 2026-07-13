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
