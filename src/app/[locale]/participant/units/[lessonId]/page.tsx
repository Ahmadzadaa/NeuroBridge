import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth-utils";
import { auth } from "@/auth";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Link } from "@/i18n/navigation";
import { getUnit, UnitError } from "@/lib/training/units-service";
import { MarkVideoWatched, ProjectForm } from "./unit-actions";

type Params = { params: Promise<{ locale: string; lessonId: string }> };

export async function generateMetadata({ params }: { params: Promise<{ locale: string; lessonId: string }> }) {
  const { locale, lessonId } = await params;
  const session = await auth();
  const unit = session?.user ? await getUnit(session.user.id, lessonId, locale).catch(() => null) : null;
  return { title: `${unit?.title ?? "BizSim"} · BizSim` };
}

async function load(userId: string, lessonId: string, locale: string) {
  try {
    return await getUnit(userId, lessonId, locale);
  } catch (error) {
    if (error instanceof UnitError) notFound();
    throw error;
  }
}

/** One unit: video -> project -> 10-question test -> points. */
export default async function UnitPage({ params }: Params) {
  const { locale, lessonId } = await params;
  setRequestLocale(locale);
  const session = await requireRole(locale, ["PARTICIPANT"]);
  const t = await getTranslations("units");
  const unit = await load(session.user.id, lessonId, locale);

  return (
    <DashboardLayout panel="participant" title={unit.title} userName={session.user.name ?? ""}>
      <div className="mx-auto max-w-3xl space-y-6">
        <Link href="/participant/units" className="text-sm text-primary hover:underline">
          ← {t("backToUnits")}
        </Link>

        <Section n={1} title={t("steps.video")} done={unit.videoDone}>
          {unit.videoUrl ? (
            <a href={unit.videoUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-primary hover:underline">
              {t("watchVideo")} ↗
            </a>
          ) : (
            <p className="text-sm text-muted-foreground">{t("videoComingSoon")}</p>
          )}
          {!unit.videoDone && <MarkVideoWatched lessonId={unit.id} />}
        </Section>

        <Section n={2} title={t("steps.project")} done={unit.projectDone}>
          {unit.brief?.scenario && (
            <div className="space-y-2 text-sm text-foreground">
              {unit.brief.scenario.split("\n").map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
          )}
          {unit.brief && unit.brief.tasks.length > 0 && (
            <>
              <p className="mt-4 text-sm font-medium text-foreground">{t("tasksHeading")}</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {unit.brief.tasks.map((task, i) => (
                  <li key={i}>{task}</li>
                ))}
              </ul>
            </>
          )}
          <ProjectForm lessonId={unit.id} initial={unit.submission?.content ?? ""} />
        </Section>

        <Section n={3} title={t("steps.test")} done={unit.testPassed}>
          <p className="text-sm text-muted-foreground">
            {unit.testScore === null
              ? t("testIntro", { points: unit.points })
              : unit.testPassed
                ? t("testPassed", { score: unit.testScore, points: unit.points })
                : t("testRetry", { score: unit.testScore })}
          </p>
          {unit.examId && (
            <Link
              href={`/participant/units/${unit.id}/test`}
              className="mt-4 inline-flex h-10 items-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              {unit.testScore === null ? t("startTest") : t("retakeTest")}
            </Link>
          )}
        </Section>
      </div>
    </DashboardLayout>
  );
}

function Section({ n, title, done, children }: { n: number; title: string; done: boolean; children: React.ReactNode }) {
  return (
    <section className="rounded-[22px] bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)] ring-1 ring-border/60 p-5 sm:p-6">
      <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs text-primary">{n}</span>
        {title}
        {done && <span className="text-sm text-success">✓</span>}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}
