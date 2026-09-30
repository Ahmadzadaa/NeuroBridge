import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Section, SectionHeading } from "@/components/marketing/sections";
import { JsonLd, productJsonLd } from "@/components/marketing/json-ld";
import { buildMarketingMetadata, marketingUrl } from "@/lib/seo/marketing-metadata";
import { getAppOrigin } from "@/lib/app-url";
import { prisma } from "@/lib/prisma";
import { PricingCalculator, type CalculatorService } from "./pricing-calculator";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return buildMarketingMetadata(locale, "/pricing");
}

/**
 * FAQ entries that still hold under per-service, participant-tiered pricing.
 * The monthly per-seat billing answers (b, c) describe the old model.
 */
const FAQ_KEYS = ["a", "d", "e"] as const;

export default async function PricingPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ payment?: string }>;
}) {
  const { locale } = await params;
  const { payment } = await searchParams;
  setRequestLocale(locale);

  const [t, tm, common, origin, services] = await Promise.all([
    getTranslations({ locale, namespace: "pricing" }),
    getTranslations({ locale, namespace: "marketing.pricing" }),
    getTranslations({ locale, namespace: "common" }),
    getAppOrigin(),
    prisma.service.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: {
        code: true,
        name: true,
        tiers: {
          orderBy: { minParticipants: "asc" },
          select: {
            minParticipants: true,
            maxParticipants: true,
            pricePerParticipant: true,
            currency: true,
          },
        },
      },
    }),
  ]);

  const calculatorServices: CalculatorService[] = services.map((s) => ({
    ...s,
    name: t.has(`services.${s.code}`) ? t(`services.${s.code}`) : s.name,
  }));

  // Advertise each service from its cheapest per-participant tier.
  const offers = calculatorServices.flatMap((s) => {
    const cheapest = s.tiers.reduce<(typeof s.tiers)[number] | null>(
      (min, tier) => (!min || tier.pricePerParticipant < min.pricePerParticipant ? tier : min),
      null
    );
    return cheapest ? [{ name: s.name, price: cheapest.pricePerParticipant, currency: cheapest.currency }] : [];
  });

  return (
    <>
      {offers.length > 0 && (
        <JsonLd
          data={productJsonLd({
            name: common("appName"),
            description: t("subtitle"),
            url: marketingUrl(origin, locale, "/pricing"),
            offers,
          })}
        />
      )}

      <Section className="pb-6 pt-14 sm:pb-8 sm:pt-20">
        <SectionHeading title={t("title")} description={t("subtitle")} />
      </Section>

      <Section className="py-6 sm:py-8">
        <div className="mx-auto w-full max-w-6xl">
          {payment === "success" && (
            <div role="status" className="mx-auto mb-6 max-w-3xl rounded-2xl border border-success/40 bg-success/10 p-4 text-sm text-foreground">
              {t("paymentSuccess")}
            </div>
          )}
          {payment === "failed" && (
            <div role="alert" className="mx-auto mb-6 max-w-3xl rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-foreground">
              {t("paymentFailed")}
            </div>
          )}
          {calculatorServices.length === 0 ? (
            <p className="text-center text-muted-foreground">{t("noServices")}</p>
          ) : (
            <PricingCalculator services={calculatorServices} locale={locale} />
          )}
        </div>
      </Section>

      <Section className="bg-subtle/70">
        <SectionHeading title={tm("faq.title")} />
        <dl className="mx-auto mt-8 max-w-3xl space-y-4">
          {FAQ_KEYS.map((key) => (
            <div key={key} className="rounded-2xl bg-card p-6 shadow-sm">
              <dt className="text-[16px] font-semibold text-foreground">
                {tm(`faq.items.${key}.question`)}
              </dt>
              <dd className="mt-2 text-[14px] leading-[1.7] text-muted-foreground">
                {tm(`faq.items.${key}.answer`)}
              </dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section className="pb-20 sm:pb-24">
        <div className="rounded-3xl bg-primary px-6 py-12 text-center text-primary-foreground sm:px-12">
          <h2 className="text-[26px] font-bold tracking-[-0.5px]">{tm("bottomCta.title")}</h2>
          <p className="mx-auto mt-3 max-w-xl text-[15px] leading-[1.7] opacity-90">
            {tm("bottomCta.body")}
          </p>
          <div className="mt-7">
            <Link href="/contact">
              <Button size="lg" variant="secondary" className="rounded-2xl px-8">
                {tm("bottomCta.button")}
              </Button>
            </Link>
          </div>
        </div>
      </Section>
    </>
  );
}
