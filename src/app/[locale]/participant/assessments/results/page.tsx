import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireRole } from "@/lib/auth-utils";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Link } from "@/i18n/navigation";
import { getStudentResults, type DimensionResult } from "@/lib/assessments/assessment-service";

type Params = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "assessments" });
  return { title: `${t("resultsTitle")} · BizSim` };
}

/** Results + personal development plan after the baseline tests. */
export default async function AssessmentResultsPage({ params }: Params) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireRole(locale, ["PARTICIPANT"]);
  const t = await getTranslations("assessments");
  const results = await getStudentResults(session.user.id, locale);
  const userName = session.user.name ?? "";

  if (!results || results.assessments.length === 0) {
    return (
      <DashboardLayout panel="participant" title={t("resultsTitle")} userName={userName}>
        <p className="text-muted-foreground">{t("noResults")}</p>
        <Link href="/participant/assessments" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
          {t("backToTests")}
        </Link>
      </DashboardLayout>
    );
  }

  const demo = results.assessments.some((a) => a.isDemo);

  return (
    <DashboardLayout panel="participant" title={t("resultsTitle")} userName={userName}>
      <div className="mx-auto max-w-3xl space-y-6">
        {demo && (
          <p role="note" className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-foreground">
            {t("demoResultsNotice")}
          </p>
        )}

        {results.assessments.map((a) => (
          <section key={a.code} aria-labelledby={`h-${a.code}`} className="rounded-2xl bg-card p-5 shadow-sm sm:p-6">
            <h2 id={`h-${a.code}`} className="text-base font-semibold text-foreground">{a.title}</h2>
            <ul className="mt-4 space-y-5">
              {a.dimensions.map((d) => (
                <li key={d.code}>
                  <Meter dimension={d} bandLabel={t(`band.${d.band}`)} />
                  <p className="mt-2 text-sm text-muted-foreground">{d.feedback}</p>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <section aria-labelledby="plan-heading" className="rounded-2xl bg-card p-5 shadow-sm sm:p-6">
          <h2 id="plan-heading" className="text-base font-semibold text-foreground">{t("planHeading")}</h2>
          <div className="mt-4 grid gap-6 sm:grid-cols-2">
            <PlanList title={t("strengths")} items={results.strengths} />
            <PlanList title={t("developmentAreas")} items={results.developmentAreas} />
          </div>
          <Link
            href="/participant/units"
            className="mt-6 inline-flex h-10 items-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            {t("continueToTraining")}
          </Link>
        </section>
      </div>
    </DashboardLayout>
  );
}

/**
 * One score against the 0-100 limit: a same-hue track and fill, with the
 * value and band always printed as text so nothing depends on color.
 */
function Meter({ dimension, bandLabel }: { dimension: DimensionResult; bandLabel: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-medium text-foreground">{dimension.label}</span>
        <span className="text-muted-foreground">
          <span className="font-semibold text-foreground">{dimension.score}</span> / 100 · {bandLabel}
        </span>
      </div>
      <div
        role="meter"
        aria-label={dimension.label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={dimension.score}
        aria-valuetext={`${dimension.score} / 100, ${bandLabel}`}
        className="mt-2 h-2 w-full overflow-hidden rounded-full bg-primary/15"
      >
        <div className="h-full rounded-full bg-primary" style={{ width: `${dimension.score}%` }} />
      </div>
    </div>
  );
}

function PlanList({ title, items }: { title: string; items: DimensionResult[] }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <ul className="mt-2 space-y-3">
        {items.map((d) => (
          <li key={d.code} className="text-sm">
            <span className="font-medium text-foreground">{d.label}</span>
            <span className="text-muted-foreground"> — {d.feedback}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
