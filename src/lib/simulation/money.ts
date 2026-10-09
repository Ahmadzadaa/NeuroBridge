/**
 * In-game money is a score, not a real amount, so it wears the reader's
 * currency: a Turkish screen showing manat read as a translation bug.
 */
const SIM_CURRENCY: Record<string, { symbol: string; intl: string }> = {
  // az-AZ ICU data differs between Node and browsers (hydration mismatch);
  // tr-TR groups digits the same way.
  az: { symbol: "₼", intl: "tr-TR" },
  tr: { symbol: "₺", intl: "tr-TR" },
  en: { symbol: "$", intl: "en-US" },
};

export function formatSimMoney(amount: number, locale: string): string {
  const { symbol, intl } = SIM_CURRENCY[locale] ?? SIM_CURRENCY.tr;
  return `${amount < 0 ? "−" : ""}${symbol}${new Intl.NumberFormat(intl).format(Math.abs(amount))}`;
}
