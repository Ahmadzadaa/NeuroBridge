import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireRole } from "@/lib/auth-utils";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { LargeTitle } from "@/components/ui/ios";
import { getCalculatorServices } from "@/lib/billing/calculator-services";
import { PricingCalculator } from "../../../(marketing)/pricing/pricing-calculator";

/** Organisations get new programmes by buying them; there is no free "create". */
export default async function BuyProgramPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireRole(locale, ["TENANT_ADMIN"]);
  const t = await getTranslations("tenant.programs");
  const services = await getCalculatorServices(locale);

  return (
    <DashboardLayout panel="tenant" title={t("buy")} userName={session.user.name ?? "Admin"}>
      <div className="mx-auto max-w-6xl space-y-8">
        <LargeTitle title={t("buy")} subtitle={t("buySubtitle")} />
        <PricingCalculator services={services} locale={locale} mode="tenant" />
      </div>
    </DashboardLayout>
  );
}
