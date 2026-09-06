import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Check, Minus } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Section, SectionHeading } from "@/components/marketing/sections";
import { JsonLd, productJsonLd } from "@/components/marketing/json-ld";
import { buildMarketingMetadata, marketingUrl } from "@/lib/seo/marketing-metadata";
import { getAppOrigin } from "@/lib/app-url";
import { formatPlanPrice, listPublicPlans } from "@/lib/marketing/plans";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return buildMarketingMetadata(locale, "/pricing");
}

/** Rows of the comparison table. Values come from the message files per plan. */
const COMPARISON_ROWS = [
  "trainings",
  "exams",
  "simulations",
  "hackathon",
  "certificates",
  "analytics",
  "aiTools",
  // Replaced single sign-on, which the platform does not have — a pricing
  // table is the worst place to advertise a feature that does not exist.
  "gamification",
  "support",
] as const;

const FAQ_KEYS = ["a", "b", "c", "d", "e"] as const;
const PLAN_BULLETS = ["a", "b", "c", "d"] as const;

export default async function PricingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [t, common, plans, origin] = await Promise.all([
    getTranslations({ locale, namespace: "marketing.pricing" }),
    getTranslations({ locale, namespace: "common" }),
    listPublicPlans(),
    getAppOrigin(),
  ]);

  /**
   * Marketing copy is keyed by the plan's slug. A plan row with no matching
   * block falls back to the shared `default` block rather than throwing —
   * a new plan added by finance must not take the pricing page down.
   */
  function planCopy(featureKey: string, suffix: string): string {
    const key = `plans.${featureKey}.${suffix}`;
    return t.has(key) ? t(key) : t(`plans.default.${suffix}`);
  }

  function comparisonCell(featureKey: string, row: string): string {
    const key = `comparison.values.${featureKey}.${row}`;
    return t.has(key) ? t(key) : "—";
  }

  return (
    <>
      {plans.length > 0 && (
        <JsonLd
          data={productJsonLd({
            name: common("appName"),
            description: t("subtitle"),
            url: marketingUrl(origin, locale, "/pricing"),
            offers: plans.map((plan) => ({
              name: plan.name,
              price: plan.pricePerSeatMonthly,
              currency: plan.currency,
            })),
          })}
        />
      )}

      <Section className="pb-6 pt-14 sm:pb-8 sm:pt-20">
        <SectionHeading title={t("title")} description={t("subtitle")} />
      </Section>

      <Section className="py-6 sm:py-8">
        {plans.length === 0 ? (
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardContent className="p-0">
              <EmptyState title={t("noPlans")} description={t("noPlansHint")} />
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-5 md:grid-cols-3">
            {plans.map((plan, index) => {
              // The middle card is the one to steer people towards; with two
              // plans that is the more expensive one, which is the same intent.
              const highlighted = index === Math.floor((plans.length - 1) / 2);
              return (
                <Card
                  key={plan.id}
                  className={
                    highlighted
                      ? "relative overflow-visible rounded-2xl border-2 border-primary shadow-md"
                      : "rounded-2xl border-0 shadow-sm"
                  }
                >
                  <CardContent className="p-6">
                    {highlighted && (
                      <span className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.5px] text-primary-foreground">
                        {t("popular")}
                      </span>
                    )}

                    <h2 className="text-[18px] font-semibold text-foreground">
                      {plan.name}
                    </h2>
                    <p className="mt-1 text-[13px] leading-[1.6] text-muted-foreground">
                      {planCopy(plan.featureKey, "tagline")}
                    </p>

                    <p className="mt-5 text-[36px] font-bold leading-none tracking-[-1px] text-foreground">
                      {formatPlanPrice(plan, locale)}
                    </p>
                    <p className="mt-1.5 text-[13px] text-muted-foreground">
                      {t("perSeatMonth")}
                    </p>

                    <ul className="mt-6 space-y-2.5">
                      <li className="flex gap-2 text-[14px] text-muted-foreground">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                        {t("minSeats", { count: plan.minSeats })}
                      </li>
                      {plan.trialDays > 0 && (
                        <li className="flex gap-2 text-[14px] text-muted-foreground">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                          {t("trialDays", { count: plan.trialDays })}
                        </li>
                      )}
                      {PLAN_BULLETS.map((bullet) => (
                        <li
                          key={bullet}
                          className="flex gap-2 text-[14px] text-muted-foreground"
                        >
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                          {planCopy(plan.featureKey, `bullets.${bullet}`)}
                        </li>
                      ))}
                    </ul>

                    <Link href="/contact" className="mt-7 block">
                      <Button
                        className="w-full rounded-xl"
                        variant={highlighted ? "default" : "outline"}
                      >
                        {t("cta")}
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </Section>

      {plans.length > 0 && (
        <Section>
          <SectionHeading title={t("comparison.title")} align="left" />
          {/* Wide table on a narrow phone: scroll the table, never the page. */}
          <div className="mt-6 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[180px]">
                    {t("comparison.feature")}
                  </TableHead>
                  {plans.map((plan) => (
                    <TableHead key={plan.id} className="min-w-[120px]">
                      {plan.name}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {COMPARISON_ROWS.map((row) => (
                  <TableRow key={row}>
                    <TableCell className="font-medium">
                      {t(`comparison.rows.${row}`)}
                    </TableCell>
                    {plans.map((plan) => {
                      const value = comparisonCell(plan.featureKey, row);
                      return (
                        <TableCell key={plan.id}>
                          {value === "yes" ? (
                            <Check
                              className="h-4 w-4 text-success"
                              aria-label={t("comparison.included")}
                            />
                          ) : value === "no" ? (
                            <Minus
                              className="h-4 w-4 text-muted-foreground"
                              aria-label={t("comparison.notIncluded")}
                            />
                          ) : (
                            <span className="text-[14px] text-muted-foreground">{value}</span>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Section>
      )}

      <Section className="bg-subtle/70">
        <SectionHeading title={t("faq.title")} />
        <dl className="mx-auto mt-8 max-w-3xl space-y-4">
          {FAQ_KEYS.map((key) => (
            <div key={key} className="rounded-2xl bg-card p-6 shadow-sm">
              <dt className="text-[16px] font-semibold text-foreground">
                {t(`faq.items.${key}.question`)}
              </dt>
              <dd className="mt-2 text-[14px] leading-[1.7] text-muted-foreground">
                {t(`faq.items.${key}.answer`)}
              </dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section className="pb-20 sm:pb-24">
        <div className="rounded-3xl bg-primary px-6 py-12 text-center text-primary-foreground sm:px-12">
          <h2 className="text-[26px] font-bold tracking-[-0.5px]">{t("bottomCta.title")}</h2>
          <p className="mx-auto mt-3 max-w-xl text-[15px] leading-[1.7] opacity-90">
            {t("bottomCta.body")}
          </p>
          <div className="mt-7">
            <Link href="/contact">
              <Button size="lg" variant="secondary" className="rounded-2xl px-8">
                {t("bottomCta.button")}
              </Button>
            </Link>
          </div>
        </div>
      </Section>
    </>
  );
}
