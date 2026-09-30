import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Clock, Mail, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Section, SectionHeading } from "@/components/marketing/sections";
import { buildMarketingMetadata } from "@/lib/seo/marketing-metadata";
import { ContactForm } from "./contact-form";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return buildMarketingMetadata(locale, "/contact");
}

const ASSURANCES = [
  { key: "response", icon: Clock },
  { key: "privacy", icon: ShieldCheck },
  { key: "noSpam", icon: Mail },
] as const;

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "marketing.contact" });

  return (
    <Section className="pt-14 sm:pt-20">
      <SectionHeading title={t("title")} description={t("description")} />

      <div className="mx-auto mt-10 grid max-w-5xl gap-8 lg:grid-cols-[1.4fr_1fr]">
        <Card className="rounded-2xl border-0 shadow-sm">
          <CardContent className="p-6 sm:p-8">
            <ContactForm />
          </CardContent>
        </Card>

        <aside className="space-y-4">
          {ASSURANCES.map(({ key, icon: Icon }) => (
            <div key={key} className="rounded-2xl bg-subtle/50 p-5">
              <Icon className="h-5 w-5 text-primary-text" aria-hidden="true" />
              <h2 className="mt-3 text-[15px] font-semibold text-foreground">
                {t(`assurances.${key}.title`)}
              </h2>
              <p className="mt-1.5 text-[13px] leading-[1.7] text-muted-foreground">
                {t(`assurances.${key}.body`)}
              </p>
            </div>
          ))}
        </aside>
      </div>
    </Section>
  );
}
