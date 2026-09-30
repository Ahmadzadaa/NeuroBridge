import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { PricingCalculator, type CalculatorService } from "./pricing-calculator";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pricing" });
  return { title: `${t("title")} · BizSim`, description: t("subtitle") };
}

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
  const t = await getTranslations("pricing");

  const services = await prisma.service.findMany({
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
  });

  const calculatorServices: CalculatorService[] = services.map((s) => ({
    ...s,
    name: t.has(`services.${s.code}`) ? t(`services.${s.code}`) : s.name,
  }));

  return (
    <div className="min-h-screen bg-background px-4 py-12 sm:py-16">
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">{t("title")}</h1>
        <p className="mt-2 text-muted-foreground">{t("subtitle")}</p>

        {payment === "success" && (
          <div role="status" className="mt-6 rounded-lg border border-success/40 bg-success/10 p-4 text-sm text-foreground">
            {t("paymentSuccess")}
          </div>
        )}
        {payment === "failed" && (
          <div role="alert" className="mt-6 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-foreground">
            {t("paymentFailed")}
          </div>
        )}

        <div className="mt-8">
          {calculatorServices.length === 0 ? (
            <p className="text-muted-foreground">{t("noServices")}</p>
          ) : (
            <PricingCalculator services={calculatorServices} locale={locale} />
          )}
        </div>
      </div>
    </div>
  );
}
