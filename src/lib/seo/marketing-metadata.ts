import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getAppOrigin } from "@/lib/app-url";
import { routing, type Locale } from "@/i18n/routing";

/**
 * Metadata for the public marketing pages.
 *
 * Search engines index one page per language, so every page has to declare
 * which languages it exists in (`alternates.languages`) and which URL is
 * canonical for the language being served. Without those, three translations
 * of the same page compete with each other in the index.
 */

/** Marketing routes, relative to the locale prefix. */
export const MARKETING_PATHS = [
  "",
  "/features",
  "/pricing",
  "/contact",
  "/privacy",
  "/terms",
] as const;

export type MarketingPath = (typeof MARKETING_PATHS)[number];

/** Message namespace holding the title/description for each page. */
const SEO_NAMESPACE: Record<MarketingPath, string> = {
  "": "marketing.seo.home",
  "/features": "marketing.seo.features",
  "/pricing": "marketing.seo.pricing",
  "/contact": "marketing.seo.contact",
  "/privacy": "marketing.seo.privacy",
  "/terms": "marketing.seo.terms",
};

export function marketingUrl(origin: string, locale: string, path: MarketingPath): string {
  return `${origin}/${locale}${path}`;
}

export async function buildMarketingMetadata(
  locale: string,
  path: MarketingPath,
): Promise<Metadata> {
  const origin = await getAppOrigin();
  const t = await getTranslations({ locale, namespace: SEO_NAMESPACE[path] });
  const common = await getTranslations({ locale, namespace: "common" });

  const title = t("title");
  const description = t("description");
  const canonical = marketingUrl(origin, locale, path);

  // hreflang needs every language the page exists in, plus x-default for a
  // visitor whose language matches none of them.
  const languages: Record<string, string> = Object.fromEntries(
    routing.locales.map((l: Locale) => [l, marketingUrl(origin, l, path)]),
  );
  languages["x-default"] = marketingUrl(origin, routing.defaultLocale, path);

  return {
    title,
    description,
    metadataBase: new URL(origin),
    alternates: { canonical, languages },
    openGraph: {
      type: "website",
      siteName: common("appName"),
      title,
      description,
      url: canonical,
      locale,
      images: [{ url: `${origin}/og/default.svg`, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${origin}/og/default.svg`],
    },
    robots: { index: true, follow: true },
  };
}
