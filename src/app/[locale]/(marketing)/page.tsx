import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import { auth, getRoleDashboardPath } from "@/auth";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ScreenshotPlaceholder,
  Section,
  SectionHeading,
} from "@/components/marketing/sections";
import { buildMarketingMetadata } from "@/lib/seo/marketing-metadata";
import { getCalculatorServices } from "@/lib/billing/calculator-services";
import { serviceIcon } from "@/lib/billing/service-icons";
import { formatKurus } from "@/lib/billing/money";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return buildMarketingMetadata(locale, "");
}

/** Feature blocks and steps are indexed so the copy stays in the message files. */
const FEATURE_KEYS = ["a", "b", "c", "d"] as const;

/** Which screen each home feature card illustrates. */
const FEATURE_MOCKS = {
  a: "training",
  b: "simulation",
  c: "jury",
  d: "analytics",
} as const;
const STEP_KEYS = ["one", "two", "three"] as const;
const PROOF_KEYS = ["a", "b", "c", "d"] as const;

export default async function MarketingHomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Someone already signed in has no use for the sales pitch — this preserves
  // the behaviour the previous landing page had.
  const session = await auth();
  if (session?.user) {
    redirect(getRoleDashboardPath(session.user.role, locale));
  }

  const t = await getTranslations({ locale, namespace: "marketing.home" });
  const services = await getCalculatorServices(locale);
  // Each service from its cheapest per-participant tier, as the pricing page advertises it.
  const fromPrices = services.flatMap((s) => {
    const cheapest = s.tiers.reduce<(typeof s.tiers)[number] | null>(
      (min, tier) => (!min || tier.pricePerParticipant < min.pricePerParticipant ? tier : min),
      null
    );
    return cheapest ? [{ code: s.code, name: s.name, price: formatKurus(cheapest.pricePerParticipant, cheapest.currency, "tr-TR") }] : [];
  });

  return (
    <>
      {/* Hero — problem, then the answer to it. */}
      <Section className="relative isolate overflow-hidden pb-8 pt-14 sm:pb-12 sm:pt-20">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -left-32 -top-24 h-[420px] w-[420px] rounded-full bg-primary/20 blur-[120px]" />
          <div className="absolute -right-24 top-24 h-[360px] w-[360px] rounded-full bg-fuchsia-500/15 blur-[120px]" />
          <div className="absolute bottom-0 left-1/3 h-[300px] w-[300px] rounded-full bg-sky-400/10 blur-[110px]" />
        </div>
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div className="min-w-0">
            <p className="ios-reveal inline-flex items-center gap-1.5 rounded-full bg-card/70 px-3.5 py-1.5 text-[12px] font-semibold text-primary-text ring-1 ring-border/60 backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              {t("hero.eyebrow")}
            </p>
            <h1
              className="ios-reveal mt-5 bg-gradient-to-br from-foreground via-foreground to-foreground/55 bg-clip-text text-[38px] font-bold leading-[1.06] tracking-[-1.4px] break-words text-transparent sm:text-[58px]"
              style={{ "--i": 1 } as React.CSSProperties}
            >
              {t("hero.headline")}
            </h1>
            <p className="mt-3 text-[17px] font-medium text-muted-foreground">
              {t("hero.problem")}
            </p>
            <p className="mt-4 max-w-xl text-[16px] leading-[1.7] text-muted-foreground">
              {t("hero.solution")}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/contact">
                <Button size="lg" className="h-12 rounded-full px-7 shadow-[0_12px_30px_-12px_var(--primary)]">
                  {t("hero.primaryCta")}
                  <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
                </Button>
              </Link>
              <Link href="/features">
                <Button size="lg" variant="outline" className="h-12 rounded-full px-7">
                  {t("hero.secondaryCta")}
                </Button>
              </Link>
            </div>

            <p className="mt-4 text-[13px] text-muted-foreground">{t("hero.reassurance")}</p>
          </div>

          <ScreenshotPlaceholder label={t("hero.screenshot")} variant="dashboard" />
        </div>
      </Section>

      {/* Social proof strip. */}
      <Section className="py-10 sm:py-12">
        <p className="text-center text-[12px] font-semibold uppercase tracking-[0.8px] text-muted-foreground">
          {t("proof.title")}
        </p>
        <ul className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          {PROOF_KEYS.map((key) => (
            <li
              key={key}
              className="flex h-16 items-center justify-center rounded-[18px] bg-card/70 px-4 text-center text-[13px] font-semibold text-muted-foreground ring-1 ring-border/60 backdrop-blur"
            >
              {t(`proof.logos.${key}`)}
            </li>
          ))}
        </ul>
        <p className="mt-6 text-center text-[15px] italic leading-[1.7] text-muted-foreground">
          {t("proof.quote")}
        </p>
        <p className="mt-2 text-center text-[13px] font-medium text-foreground">
          {t("proof.attribution")}
        </p>
      </Section>

      {/* Core capabilities. */}
      <Section>
        <SectionHeading
          eyebrow={t("features.eyebrow")}
          title={t("features.title")}
          description={t("features.description")}
        />
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {FEATURE_KEYS.map((key) => (
            <Card key={key}>
              <CardContent className="p-6">
                <h3 className="text-[18px] font-semibold text-foreground">
                  {t(`features.items.${key}.title`)}
                </h3>
                <p className="mt-2 text-[14px] leading-[1.7] text-muted-foreground">
                  {t(`features.items.${key}.body`)}
                </p>
                <ScreenshotPlaceholder
                  label={t(`features.items.${key}.screenshot`)}
                  variant={FEATURE_MOCKS[key]}
                  ratio="16 / 9"
                  className="mt-5"
                />
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>

      {/* How it works. */}
      <Section className="bg-subtle/70">
        <SectionHeading title={t("steps.title")} description={t("steps.description")} />
        <ol className="mt-10 grid gap-6 md:grid-cols-3">
          {STEP_KEYS.map((key, index) => (
            <li key={key} className="rounded-[22px] bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)] ring-1 ring-border/60 p-6">
              <span className="flex h-11 w-11 items-center justify-center rounded-[13px] bg-gradient-to-br from-indigo-500 to-violet-600 text-[16px] font-bold text-white shadow-sm">
                {index + 1}
              </span>
              <h3 className="mt-4 text-[17px] font-semibold text-foreground">
                {t(`steps.items.${key}.title`)}
              </h3>
              <p className="mt-2 text-[14px] leading-[1.7] text-muted-foreground">
                {t(`steps.items.${key}.body`)}
              </p>
            </li>
          ))}
        </ol>
      </Section>

      {/* Pricing preview — the same plan rows the pricing page renders. */}
      <Section>
        <SectionHeading
          title={t("pricingPreview.title")}
          description={t("pricingPreview.description")}
        />
        <ul className="mt-10 grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {fromPrices.map((s, i) => {
            const { icon: Icon, gradient } = serviceIcon(s.code);
            return (
              <li
                key={s.code}
                style={{ "--i": i } as React.CSSProperties}
                className="ios-reveal flex flex-col rounded-[22px] bg-card p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)] ring-1 ring-border/60"
              >
                <span className={`flex h-11 w-11 items-center justify-center rounded-[13px] bg-gradient-to-br text-white shadow-sm ${gradient}`}>
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-[16px] font-semibold text-foreground">{s.name}</h3>
                <p className="mt-auto pt-3 text-[13px] text-muted-foreground">
                  {t("pricingPreview.from")} <span className="text-[17px] font-bold tabular-nums text-foreground">{s.price}</span>
                </p>
              </li>
            );
          })}
        </ul>
        <div className="mt-8 text-center">
          <Link href="/pricing">
            <Button variant="outline" size="lg" className="rounded-full px-6">
              {t("pricingPreview.cta")}
            </Button>
          </Link>
        </div>
      </Section>

      {/* Closing call to action. */}
      <Section className="pb-20 sm:pb-24">
        <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 px-6 py-14 text-center text-white shadow-[0_30px_80px_-30px_rgba(79,70,229,0.7)] sm:px-12">
          <span aria-hidden="true" className="pointer-events-none absolute -left-16 -top-20 h-64 w-64 rounded-full bg-white/15 blur-3xl" />
          <span aria-hidden="true" className="pointer-events-none absolute -bottom-24 right-10 h-64 w-64 rounded-full bg-sky-300/25 blur-3xl" />
          <h2 className="relative text-[28px] font-bold leading-[1.15] tracking-[-0.8px] sm:text-[38px]">
            {t("cta.title")}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-[16px] leading-[1.7] opacity-90">
            {t("cta.body")}
          </p>
          <ul className="mx-auto mt-6 flex max-w-xl flex-wrap justify-center gap-x-6 gap-y-2 text-[14px] opacity-90">
            {PROOF_KEYS.slice(0, 3).map((key) => (
              <li key={key} className="flex items-center gap-1.5">
                <Check className="h-4 w-4" aria-hidden="true" />
                {t(`cta.bullets.${key}`)}
              </li>
            ))}
          </ul>
          <div className="mt-8">
            <Link href="/contact">
              <Button size="lg" className="h-12 rounded-full bg-white px-8 text-indigo-700 hover:bg-white/90">
                {t("cta.button")}
                <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
              </Button>
            </Link>
          </div>
        </div>
      </Section>
    </>
  );
}
