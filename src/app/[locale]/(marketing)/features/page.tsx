import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  ScreenshotPlaceholder,
  Section,
  SectionHeading,
} from "@/components/marketing/sections";
import { buildMarketingMetadata } from "@/lib/seo/marketing-metadata";
import { cn } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return buildMarketingMetadata(locale, "/features");
}

/**
 * One block per capability, alternating sides.
 *
 * The keys match the modules the platform actually ships — trainings, exams,
 * simulations, hackathon/jury, certificates, analytics — so the page cannot
 * drift into promising something that does not exist.
 */
const FEATURES = [
  "trainings",
  "exams",
  "simulations",
  "hackathon",
  "certificates",
  "analytics",
] as const;

/** Each module shows the screen it is actually about. */
const MODULE_MOCKS = {
  trainings: "training",
  exams: "exam",
  simulations: "simulation",
  hackathon: "ranking",
  certificates: "certificate",
  analytics: "analytics",
} as const;

const BULLET_KEYS = ["a", "b", "c"] as const;

export default async function FeaturesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "marketing.features" });

  return (
    <>
      <Section className="pb-6 pt-14 sm:pb-8 sm:pt-20">
        <SectionHeading
          eyebrow={t("eyebrow")}
          title={t("title")}
          description={t("description")}
        />
      </Section>

      {FEATURES.map((key, index) => (
        <Section key={key} className={index % 2 === 1 ? "bg-subtle/70" : undefined}>
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div className={cn("min-w-0", index % 2 === 1 && "lg:order-2")}>
              <p className="break-words text-[12px] font-semibold uppercase tracking-[0.8px] text-primary-text">
                {t(`items.${key}.eyebrow`)}
              </p>
              <h2 className="mt-2 text-[26px] font-bold leading-[1.25] tracking-[-0.5px] break-words text-foreground sm:text-[30px]">
                {t(`items.${key}.title`)}
              </h2>
              <p className="mt-3 text-[15px] leading-[1.7] text-muted-foreground">
                {t(`items.${key}.body`)}
              </p>
              <ul className="mt-5 space-y-2.5">
                {BULLET_KEYS.map((bullet) => (
                  <li key={bullet} className="flex gap-2.5 text-[14px] leading-[1.6]">
                    <span
                      className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                      aria-hidden="true"
                    />
                    <span className="text-muted-foreground">
                      {t(`items.${key}.bullets.${bullet}`)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <ScreenshotPlaceholder
              label={t(`items.${key}.screenshot`)}
              variant={MODULE_MOCKS[key]}
              className={index % 2 === 1 ? "lg:order-1" : undefined}
            />
          </div>
        </Section>
      ))}

      <Section className="pb-20 sm:pb-24">
        <div className="rounded-3xl border border-border bg-card px-6 py-12 text-center sm:px-12">
          <h2 className="text-[26px] font-bold tracking-[-0.5px] text-foreground">
            {t("cta.title")}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-[15px] leading-[1.7] text-muted-foreground">
            {t("cta.body")}
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link href="/contact">
              <Button size="lg" className="rounded-2xl px-7">
                {t("cta.primary")}
                <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
              </Button>
            </Link>
            <Link href="/pricing">
              <Button size="lg" variant="outline" className="rounded-2xl px-7">
                {t("cta.secondary")}
              </Button>
            </Link>
          </div>
        </div>
      </Section>
    </>
  );
}
