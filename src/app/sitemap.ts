import type { MetadataRoute } from "next";
import { getAppOrigin } from "@/lib/app-url";
import { routing } from "@/i18n/routing";
import { MARKETING_PATHS, marketingUrl } from "@/lib/seo/marketing-metadata";

/**
 * Only the public marketing pages belong here. Every other route in the app
 * is behind authentication, and listing those would advertise the shape of
 * the product's private surface without any indexing benefit.
 *
 * Each URL carries its translations as alternates so a crawler treats the
 * three languages as one page rather than as duplicates.
 */
const PRIORITY: Record<string, number> = {
  "": 1,
  "/pricing": 0.9,
  "/features": 0.8,
  "/contact": 0.7,
  "/privacy": 0.3,
  "/terms": 0.3,
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = await getAppOrigin();
  const lastModified = new Date();

  return routing.locales.flatMap((locale) =>
    MARKETING_PATHS.map((path) => ({
      url: marketingUrl(origin, locale, path),
      lastModified,
      changeFrequency: (path === "" ? "weekly" : "monthly") as "weekly" | "monthly",
      priority: PRIORITY[path] ?? 0.5,
      alternates: {
        languages: Object.fromEntries(
          routing.locales.map((l) => [l, marketingUrl(origin, l, path)]),
        ),
      },
    })),
  );
}
