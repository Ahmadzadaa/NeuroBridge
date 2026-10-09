import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Section } from "@/components/marketing/sections";
import { LegalDocument } from "@/components/marketing/legal-document";
import { buildMarketingMetadata } from "@/lib/seo/marketing-metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return buildMarketingMetadata(locale, "/privacy");
}

/**
 * Skeleton only. These headings are the ones a KVKK/GDPR review expects to
 * find; every body is a placeholder until counsel supplies the wording — see
 * docs/landing-content-brief.md.
 */
const SECTION_KEYS = [
  "controller",
  "dataCollected",
  "purposes",
  "legalBasis",
  "sharing",
  "transfers",
  "retention",
  "security",
  "rights",
  "cookies",
  "changes",
  "contact",
] as const;

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "marketing.privacy" });

  return (
    <Section className="pt-14 sm:pt-20">
      <LegalDocument
        title={t("title")}
        updatedLabel={t("updated")}
        draftNotice={t("draftNotice")}
        sections={SECTION_KEYS.map((key) => ({
          id: key,
          heading: t(`sections.${key}.heading`),
          body: t(`sections.${key}.body`),
        }))}
      />
    </Section>
  );
}
