import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireRole } from "@/lib/auth-utils";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { ScheduleTable } from "@/components/programs/schedule-table";
import { Link } from "@/i18n/navigation";
import { getCurrentProgramForUser } from "@/lib/programs/participant-program";
import { getProgramSchedule } from "@/lib/programs/schedule-service";
import { programContentNames } from "@/lib/programs/content-names";

type Params = { params: Promise<{ locale: string }> };

const INTL: Record<string, string> = { tr: "tr-TR", en: "en-GB", az: "az-Latn-AZ" };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "participantProgram" });
  return { title: `${t("title")} · BizSim` };
}

/** Screen 02 — what the program is, when it runs, and what comes at the end. */
export default async function ParticipantProgramPage({ params }: Params) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireRole(locale, ["PARTICIPANT"]);
  const t = await getTranslations("participantProgram");
  const tTrain = await getTranslations("tenant.trainingTypes");
  const tSim = await getTranslations("tenant.simulationTypes");

  const program = await getCurrentProgramForUser(session.user.id);
  const userName = session.user.name ?? "";

  if (!program) {
    return (
      <DashboardLayout panel="participant" title={t("title")} userName={userName}>
        <p className="text-muted-foreground">{t("noProgram")}</p>
      </DashboardLayout>
    );
  }

  const schedule = await getProgramSchedule(program.id);
  const date = new Intl.DateTimeFormat(INTL[locale] ?? "tr-TR", { dateStyle: "long", timeZone: "UTC" });
  const content = await programContentNames(program, locale, { trainings: tTrain, simulations: tSim });
  const vars = {
    org: program.tenant.name,
    program: program.name,
    content: content.join(", ") || "—",
    certificate: program.certificateName ?? program.name,
  };

  const facts: [string, string][] = [
    [t("facts.org"), program.tenant.name],
    [t("facts.program"), program.name],
    [t("facts.content"), vars.content],
    [t("facts.start"), program.programStart ? date.format(program.programStart) : "—"],
    [t("facts.end"), program.programEnd ? date.format(program.programEnd) : "—"],
    [t("facts.participants"), t("participantsValue", { count: program._count.participants })],
    [t("facts.certificate"), vars.certificate],
  ];

  return (
    <DashboardLayout panel="participant" title={t("title")} userName={userName}>
      <div className="mx-auto max-w-3xl space-y-6">
        <section className="rounded-2xl bg-card p-5 shadow-sm sm:p-6">
          <h2 className="text-xl font-bold text-foreground">{program.name}</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{t("intro", vars)}</p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{t("during", vars)}</p>
        </section>

        <section className="rounded-2xl bg-card p-5 shadow-sm sm:p-6" aria-labelledby="facts-heading">
          <h2 id="facts-heading" className="text-base font-semibold text-foreground">📌 {t("factsHeading")}</h2>
          <dl className="mt-4 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
            {facts.map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="mt-0.5 font-medium text-foreground">{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="rounded-2xl bg-card p-5 shadow-sm sm:p-6" aria-labelledby="schedule-heading">
          <h2 id="schedule-heading" className="text-base font-semibold text-foreground">📅 {t("scheduleHeading")}</h2>
          <div className="mt-4">
            {schedule.length > 0 ? (
              <ScheduleTable items={schedule} locale={locale} />
            ) : (
              <p className="text-sm text-muted-foreground">{t("noSchedule")}</p>
            )}
          </div>
          <p className="mt-4 text-sm text-muted-foreground">{t("certificateNote", vars)}</p>
        </section>

        <section className="rounded-2xl bg-primary/5 p-5 sm:p-6">
          <h2 className="text-base font-semibold text-foreground">🚀 {t("ctaHeading")}</h2>
          <div className="mt-3 space-y-2 text-sm leading-relaxed text-muted-foreground">
            <p>{t("cta1")}</p>
            <p>{t("cta2")}</p>
            <p>{t("cta3")}</p>
          </div>
          <Link
            href="/participant/assessments"
            className="mt-5 inline-flex h-10 items-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            {t("start")} 🎯
          </Link>
        </section>
      </div>
    </DashboardLayout>
  );
}
