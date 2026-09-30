import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { SessionProvider } from "@/components/providers/session-provider";
import { TenantFeaturesProvider } from "@/components/providers/tenant-features-provider";
import { auth } from "@/auth";
import { getTenantFeatures } from "@/lib/tenant/features";
import "../globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

/**
 * The tab title and the description search engines read were fixed English.
 * They follow the visitor's language now, from the same message files as the
 * rest of the interface.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "common" });
  return {
    title: `${t("appName")} — ${t("appDescription")}`,
    description: t("appDescription"),
  };
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as "tr" | "en" | "az")) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();

  // The tenant id rides on the session token, so this costs one query for a
  // signed-in user and none at all on public pages.
  const session = await auth();
  const features = await getTenantFeatures(session?.user?.tenantId);

  return (
    <html lang={locale} suppressHydrationWarning className={`${inter.variable} h-full`}>
      <body className="min-h-full font-sans antialiased">
        <SessionProvider>
          <NextIntlClientProvider messages={messages}>
            <ThemeProvider>
              <QueryProvider>
                <TooltipProvider>
                  <TenantFeaturesProvider features={features}>
                    {children}
                  </TenantFeaturesProvider>
                  <Toaster position="top-right" richColors />
                </TooltipProvider>
              </QueryProvider>
            </ThemeProvider>
          </NextIntlClientProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
