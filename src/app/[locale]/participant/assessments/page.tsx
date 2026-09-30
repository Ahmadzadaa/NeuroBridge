import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireRole } from "@/lib/auth-utils";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Link } from "@/i18n/navigation";
import { listStudentAssessments } from "@/lib/assessments/assessment-service";

type Params = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "assessments" });
  return { title: `${t("title")} · BizSim` };
}

/** Baseline competency tests: what is left, what is done, and the way to the results. */
export default async function AssessmentsPage({ params }: Params) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireRole(locale, ["PARTICIPANT"]);
  const t = await getTranslations("assessments");
  const data = await listStudentAssessments(session.user.id, locale);
  const userName = session.user.name ?? "";

  if (!data) {
    return (
      <DashboardLayout panel="participant" title={t("title")} userName={userName}>
        <p className="text-muted-foreground">{t("noProgram")}</p>
      </DashboardLayout>
    );
  }

  const allDone = data.assessments.length > 0 && data.assessments.every((a) => a.completedAt);
  const anyDone = data.assessments.some((a) => a.completedAt);
  const demo = data.assessments.some((a) => a.isDemo);

  return (
    <DashboardLayout panel="participant" title={t("title")} userName={userName}>
      <div className="mx-auto max-w-3xl space-y-4">
        <p className="text-sm text-muted-foreground">{t("intro")}</p>
        {demo && (
          <p role="note" className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-foreground">
            {t("demoNotice")}
          </p>
        )}
        <ul className="space-y-3">
          {data.assessments.map((a, i) => (
            <li key={a.code} className="flex flex-col gap-3 rounded-2xl bg-card p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{t("step", { n: i + 1, total: data.assessments.length })}</p>
                <h2 className="mt-0.5 font-semibold text-foreground">{a.title}</h2>
                {a.description && <p className="mt-1 text-sm text-muted-foreground">{a.description}</p>}
              </div>
              {a.completedAt ? (
                <span className="shrink-0 rounded-full bg-success/10 px-3 py-1 text-xs font-semibold text-success">
                  ✓ {t("completed")}
                </span>
              ) : (
                <Link
                  href={`/participant/assessments/${a.code}`}
                  className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  {t("start")}
                </Link>
              )}
            </li>
          ))}
        </ul>
        {anyDone && (
          <Link
            href="/participant/assessments/results"
            className="inline-flex h-10 items-center rounded-lg border border-border px-5 text-sm font-semibold text-foreground hover:bg-accent"
          >
            {allDone ? t("viewResults") : t("viewPartialResults")}
          </Link>
        )}
      </div>
    </DashboardLayout>
  );
}
