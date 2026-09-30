import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireRole } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { getTenantAssessmentOverview } from "@/lib/assessments/assessment-service";

type Params = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "tenantAssessments" });
  return { title: `${t("title")} · BizSim` };
}

/**
 * The university's view of baseline results. Psychological scores appear only
 * for students who consented; the service enforces that, this page just renders.
 */
export default async function TenantAssessmentsPage({ params }: Params) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireRole(locale, ["TENANT_ADMIN", "TENANT_VIEWER"]);
  const t = await getTranslations("tenantAssessments");
  const tenantId = session.user.tenantId!;

  const [overview, unread] = await Promise.all([
    getTenantAssessmentOverview(tenantId, locale),
    prisma.tenantNotification.findMany({
      where: { tenantId, type: "ASSESSMENTS_COMPLETED", readAt: null },
      select: { id: true, payload: true },
    }),
  ]);
  const fresh = new Set(unread.map((n) => (JSON.parse(n.payload) as { userId: string }).userId));
  // Viewing the list is what "reading" these notifications means.
  if (unread.length > 0) {
    await prisma.tenantNotification.updateMany({
      where: { id: { in: unread.map((n) => n.id) } },
      data: { readAt: new Date() },
    });
  }

  const fmt = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : locale === "az" ? "az-Latn-AZ" : "tr-TR", {
    dateStyle: "medium",
  });

  return (
    <DashboardLayout panel="tenant" title={t("title")} userName={session.user.name ?? ""}>
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        {unread.length > 0 && (
          <p role="status" className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm text-foreground">
            {t("newCompletions", { count: unread.length })}
          </p>
        )}
        {overview.rows.length === 0 ? (
          <p className="text-muted-foreground">{t("empty")}</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl bg-card shadow-sm">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th scope="col" className="px-4 py-3 font-medium">{t("student")}</th>
                  <th scope="col" className="px-4 py-3 font-medium">{t("program")}</th>
                  {overview.assessments.map((a) => (
                    <th key={a.code} scope="col" className="px-4 py-3 font-medium">{a.title}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {overview.rows.map((row) => (
                  <tr key={`${row.userId}-${row.programName}`} className="border-b border-border align-top last:border-0">
                    <th scope="row" className="px-4 py-3 font-medium text-foreground">
                      {row.name}
                      {fresh.has(row.userId) && (
                        <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                          {t("new")}
                        </span>
                      )}
                      <span className="block text-xs font-normal text-muted-foreground">{row.email}</span>
                    </th>
                    <td className="px-4 py-3 text-muted-foreground">{row.programName}</td>
                    {row.results.map((r) => {
                      const meta = overview.assessments.find((a) => a.code === r.code);
                      const kind = meta?.kind;
                      return (
                        <td key={r.code} className="px-4 py-3">
                          {!r.completedAt ? (
                            <span className="text-muted-foreground">{t("notStarted")}</span>
                          ) : r.scores ? (
                            <>
                              <span className="text-foreground">✓ {fmt.format(r.completedAt)}</span>
                              <span className="mt-1 block text-xs tabular-nums text-muted-foreground">
                                {Object.entries(r.scores)
                                  .map(([code, score]) => `${meta?.dimensionLabels[code] ?? code}: ${score}`)
                                  .join(" · ")}
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="text-foreground">✓ {fmt.format(r.completedAt)}</span>
                              {kind === "PSYCH" && (
                                <span className="mt-1 block text-xs text-muted-foreground">{t("notShared")}</span>
                              )}
                            </>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
