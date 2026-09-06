import type { ReactNode } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getAppOrigin } from "@/lib/app-url";
import {
  MarketingFooter,
  MarketingHeader,
} from "@/components/marketing/marketing-chrome";
import { JsonLd, organizationJsonLd } from "@/components/marketing/json-ld";

/**
 * Chrome for the public pages.
 *
 * Separate from the dashboard layout because the two share nothing: no
 * sidebar, no session, no tenant. The Organization payload lives here so it is
 * emitted once per page without each page having to remember it.
 */
export default async function MarketingLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [origin, common, seo] = await Promise.all([
    getAppOrigin(),
    getTranslations({ locale, namespace: "common" }),
    getTranslations({ locale, namespace: "marketing.seo.home" }),
  ]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <JsonLd
        data={organizationJsonLd({
          name: common("appName"),
          description: seo("description"),
          url: `${origin}/${locale}`,
          logoUrl: `${origin}/og/default.svg`,
          contactEmail: process.env.LEADS_NOTIFICATION_EMAIL || undefined,
        })}
      />
      <MarketingHeader />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
    </div>
  );
}
