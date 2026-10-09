import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireRole } from "@/lib/auth-utils";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Link } from "@/i18n/navigation";
import { BarChart3, CheckCircle2, ChevronRight, ClipboardCheck } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { ProgressRing, WelcomeHero } from "@/components/dashboard/dashboard-kit";
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
  const done = data.assessments.filter((a) => a.completedAt).length;

  return (
    <DashboardLayout panel="participant" title={t("title")} userName={userName}>
      <div className="mx-auto max-w-3xl space-y-6">
        <WelcomeHero
          title={t("title")}
          subtitle={t("intro")}
          aside={
            data.assessments.length > 0 && (
              <ProgressRing
                value={(done / data.assessments.length) * 100}
                label={`${done}/${data.assessments.length}`}
                caption={t("completed")}
                onDark
                responsive
                size={120}
              />
            )
          }
        />
        {demo && (
          <p role="note" className="rounded-2xl bg-warning/10 px-4 py-3 text-[14px] text-foreground ring-1 ring-warning/30">
            {t("demoNotice")}
          </p>
        )}
        <ul className="space-y-3">
          {data.assessments.map((a, i) => {
            const body = (
              <>
                <span
                  aria-hidden="true"
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-gradient-to-br text-white ${
                    a.completedAt ? "from-emerald-400 to-teal-600" : "from-sky-400 to-blue-600"
                  }`}
                >
                  {a.completedAt ? <CheckCircle2 className="h-6 w-6" /> : <ClipboardCheck className="h-6 w-6" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-medium text-muted-foreground">
                    {t("step", { n: i + 1, total: data.assessments.length })}
                  </p>
                  <h2 className="text-[16px] font-semibold tracking-[-0.2px] text-foreground">{a.title}</h2>
                  {a.description && <p className="mt-0.5 line-clamp-2 text-[13px] text-muted-foreground">{a.description}</p>}
                </div>
                {a.completedAt ? (
                  <span className="shrink-0 rounded-full bg-success/12 px-3 py-1 text-[12px] font-semibold text-success">
                    {t("completed")}
                  </span>
                ) : (
                  <span className="inline-flex shrink-0 items-center gap-1 text-[14px] font-semibold text-primary">
                    {t("start")}
                    <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                  </span>
                )}
              </>
            );
            const cls =
              "group flex items-center gap-4 rounded-[22px] bg-card p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)] ring-1 ring-border/60 sm:p-5";
            return (
              <li key={a.code} className="ios-reveal" style={{ "--i": i + 1 } as React.CSSProperties}>
                {a.completedAt ? (
                  <div className={cls}>{body}</div>
                ) : (
                  <Link href={`/participant/assessments/${a.code}`} className={`${cls} transition-transform duration-300 hover:-translate-y-0.5`}>
                    {body}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
        {anyDone && (
          <Link href="/participant/assessments/results" className={buttonVariants({ variant: allDone ? "default" : "outline", size: "lg" })}>
            <BarChart3 className="h-4 w-4" aria-hidden="true" />
            {allDone ? t("viewResults") : t("viewPartialResults")}
          </Link>
        )}
      </div>
    </DashboardLayout>
  );
}
