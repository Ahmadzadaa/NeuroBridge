import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireRole } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { LargeTitle, Reveal } from "@/components/ui/ios";
import { CheckCircle2 } from "lucide-react";
import { getTenantAssessmentOverview } from "@/lib/assessments/assessment-service";
import { formatDate } from "@/lib/format-date";

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

  const fmt = { format: (value: Date | string) => formatDate(value, locale, "medium") };

  return (
    <DashboardLayout panel="tenant" title={t("title")} userName={session.user.name ?? ""}>
      <div className="space-y-6">
        <LargeTitle title={t("title")} subtitle={t("subtitle")} />
        {unread.length > 0 && (
          <p role="status" className="ios-reveal rounded-2xl bg-primary/10 px-4 py-3 text-[14px] text-foreground ring-1 ring-primary/25">
            {t("newCompletions", { count: unread.length })}
          </p>
        )}
        {overview.rows.length === 0 ? (
          <p className="rounded-[22px] bg-card px-4 py-10 text-center text-[14px] text-muted-foreground ring-1 ring-border/60">
            {t("empty")}
          </p>
        ) : (
          <Reveal index={1} className="overflow-x-auto rounded-[22px] bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)] ring-1 ring-border/60">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-border/60 text-[12px] font-semibold uppercase tracking-[0.4px] text-muted-foreground">
                  <th scope="col" className="sticky left-0 bg-card px-5 py-3">{t("student")}</th>
                  <th scope="col" className="px-4 py-3">{t("program")}</th>
                  {overview.assessments.map((a) => (
                    <th key={a.code} scope="col" className="px-4 py-3 normal-case tracking-normal">{a.title}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {overview.rows.map((row) => (
                  <tr key={`${row.userId}-${row.programName}`} className="border-b border-border/60 align-top transition-colors last:border-0 hover:bg-muted/40">
                    <th scope="row" className="sticky left-0 bg-card px-5 py-3.5 font-medium text-foreground">
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
                            <span className="rounded-full bg-muted px-2.5 py-0.5 text-[12px] font-medium text-muted-foreground">{t("notStarted")}</span>
                          ) : r.scores ? (
                            <>
                              <span className="inline-flex items-center gap-1 rounded-full bg-success/12 px-2.5 py-0.5 text-[12px] font-medium text-success">
                                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                                {fmt.format(r.completedAt)}
                              </span>
                              <span className="mt-1 block text-xs tabular-nums text-muted-foreground">
                                {Object.entries(r.scores)
                                  .map(([code, score]) => `${meta?.dimensionLabels[code] ?? code}: ${score}`)
                                  .join(" · ")}
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="inline-flex items-center gap-1 rounded-full bg-success/12 px-2.5 py-0.5 text-[12px] font-medium text-success">
                                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                                {fmt.format(r.completedAt)}
                              </span>
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
          </Reveal>
        )}
      </div>
    </DashboardLayout>
  );
}
