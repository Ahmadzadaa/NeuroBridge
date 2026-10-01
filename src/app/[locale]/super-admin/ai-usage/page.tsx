import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireRole } from "@/lib/auth-utils";
import { withTenantContext } from "@/lib/db/tenant-context";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { LargeTitle } from "@/components/ui/ios";
import { PAGE_ROWS, ReportBody } from "@/components/reports/report-body";
import { buildAiUsageReport } from "@/ai/mentor/usage-report";
import type { Translate } from "@/lib/reports/university-types";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "tenant.reports" });
  return { title: `${t("types.aiMentor.title")} · BizSim` };
}

/** Platform-wide AI Mentor usage, broken down by organisation. Super admins only. */
export default async function AiUsagePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireRole(locale, ["SUPER_ADMIN"]);
  const t = (await getTranslations({ locale, namespace: "tenant.reports" })) as unknown as Translate;

  const report = await withTenantContext(
    { tenantId: null, userId: session.user.id, role: "SUPER_ADMIN", isSuperAdmin: true },
    (tx) => buildAiUsageReport(tx, { tenantId: null, t, locale, scope: t("allTenants") })
  );

  return (
    <DashboardLayout panel="super-admin" title={report.title} userName={session.user.name ?? ""}>
      <div className="space-y-6">
        <LargeTitle title={report.title} subtitle={report.description} />
        <ReportBody
          report={report}
          locale={locale}
          labels={{ noData: t("noData"), moreRows: (total: number) => t("moreRows", { shown: PAGE_ROWS, total }) }}
        />
      </div>
    </DashboardLayout>
  );
}
