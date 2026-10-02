/**
 * Currencies the service catalogue is priced in. Each price tier exists once
 * per currency; there is no exchange-rate conversion — the platform team sets
 * every price. Both are accepted by PayTR (TRY is sent as "TL").
 */
export const PRICE_CURRENCIES = ["TRY", "USD"] as const;
export type PriceCurrency = (typeof PRICE_CURRENCIES)[number];

/** The base currency: every service must be priced in it. */
export const BASE_CURRENCY: PriceCurrency = "TRY";

export const CURRENCY_SYMBOL: Record<PriceCurrency, string> = { TRY: "₺", USD: "$" };

/** Turkish visitors see lira; everyone else (Azerbaijani, English) dollars. */
export function preferredCurrency(locale: string): PriceCurrency {
  return locale === "tr" ? "TRY" : "USD";
}

/**
 * Currencies every one of the given services is fully priced in, base first.
 * A currency missing for any service is left out, so a quote never mixes them.
 */
export function availableCurrencies(services: { tiers: { currency: string }[] }[]): PriceCurrency[] {
  return PRICE_CURRENCIES.filter((currency) =>
    services.every((s) => s.tiers.some((t) => t.currency === currency))
  );
}

/** The locale's currency when it is priced, otherwise the first one that is. */
export function pickCurrency(locale: string, available: readonly PriceCurrency[]): PriceCurrency {
  const preferred = preferredCurrency(locale);
  return available.includes(preferred) ? preferred : (available[0] ?? BASE_CURRENCY);
}
