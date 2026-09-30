import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { ArrowRight, Check } from "lucide-react";
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
import { listPublicPlans, formatPlanPrice } from "@/lib/marketing/plans";

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
  const tp = await getTranslations({ locale, namespace: "marketing.pricing" });
  const plans = await listPublicPlans();

  return (
    <>
      {/* Hero — problem, then the answer to it. */}
      <Section className="pb-8 pt-14 sm:pb-12 sm:pt-20">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div className="min-w-0">
            <p className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1.5 text-[12px] font-semibold text-primary-text">
              {t("hero.eyebrow")}
            </p>
            <h1 className="mt-4 text-[36px] font-bold leading-[1.1] tracking-[-1px] break-words text-foreground sm:text-[52px]">
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
                <Button size="lg" className="rounded-2xl px-7">
                  {t("hero.primaryCta")}
                  <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
                </Button>
              </Link>
              <Link href="/features">
                <Button size="lg" variant="outline" className="rounded-2xl px-7">
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
              className="flex h-16 items-center justify-center rounded-xl border border-border bg-card px-4 text-center text-[13px] font-medium text-muted-foreground shadow-sm"
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
            <Card key={key} className="rounded-2xl border-0 shadow-sm">
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
            <li key={key} className="rounded-2xl bg-card p-6 shadow-sm">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-[15px] font-bold text-primary-text">
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
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {plans.map((plan) => (
            <Card key={plan.id} className="rounded-2xl border-0 shadow-sm">
              <CardContent className="p-6">
                <h3 className="text-[17px] font-semibold text-foreground">{plan.name}</h3>
                <p className="mt-3 text-[30px] font-bold tracking-[-0.5px] text-foreground">
                  {formatPlanPrice(plan, locale)}
                </p>
                <p className="mt-1 text-[13px] text-muted-foreground">
                  {tp("perSeatMonth")}
                </p>
                <p className="mt-3 text-[13px] text-muted-foreground">
                  {tp("minSeats", { count: plan.minSeats })}
                </p>
              </CardContent>
            </Card>
          ))}
          {plans.length === 0 && (
            <p className="text-[14px] text-muted-foreground">{tp("noPlans")}</p>
          )}
        </div>
        <div className="mt-8 text-center">
          <Link href="/pricing">
            <Button variant="outline" className="rounded-2xl">
              {t("pricingPreview.cta")}
            </Button>
          </Link>
        </div>
      </Section>

      {/* Closing call to action. */}
      <Section className="pb-20 sm:pb-24">
        <div className="rounded-3xl bg-primary px-6 py-12 text-center text-primary-foreground sm:px-12">
          <h2 className="text-[28px] font-bold leading-[1.2] tracking-[-0.5px] sm:text-[34px]">
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
              <Button size="lg" variant="secondary" className="rounded-2xl px-8">
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
