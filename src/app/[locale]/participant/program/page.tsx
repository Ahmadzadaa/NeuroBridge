import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireRole } from "@/lib/auth-utils";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { ScheduleTable } from "@/components/programs/schedule-table";
import { Link } from "@/i18n/navigation";
import { Award, Building2, CalendarCheck, CalendarDays, FolderKanban, Users } from "lucide-react";
import { InsetGroup, InsetRow, Reveal } from "@/components/ui/ios";
import { HeroAction, WelcomeHero } from "@/components/dashboard/dashboard-kit";
import { getCurrentProgramForUser } from "@/lib/programs/participant-program";
import { getProgramSchedule } from "@/lib/programs/schedule-service";
import { programContentNames } from "@/lib/programs/content-names";
import { formatDate } from "@/lib/format-date";

type Params = { params: Promise<{ locale: string }> };


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
  const date = { format: (value: Date | string) => formatDate(value, locale, "long") };
  const content = await programContentNames(program, locale, { trainings: tTrain, simulations: tSim });
  const vars = {
    org: program.tenant.name,
    program: program.name,
    content: content.join(", ") || "—",
    certificate: program.certificateName ?? program.name,
  };


  return (
    <DashboardLayout panel="participant" title={t("title")} userName={userName}>
      <div className="mx-auto max-w-3xl space-y-8">
        <WelcomeHero eyebrow={program.tenant.name} title={program.name} subtitle={t("intro", vars)}>
          <HeroAction href="/participant/assessments" primary>
            {t("start")}
          </HeroAction>
          <HeroAction href="/participant/units">{t("openUnits")}</HeroAction>
        </WelcomeHero>

        <Reveal index={1}>
          <InsetGroup header={t("factsHeading")}>
            <InsetRow icon={Building2} tone="indigo" title={t("facts.org")} subtitle={program.tenant.name} />
            <InsetRow
              icon={CalendarDays}
              tone="sky"
              title={t("facts.start")}
              value={program.programStart ? date.format(program.programStart) : "—"}
            />
            <InsetRow
              icon={CalendarCheck}
              tone="violet"
              title={t("facts.end")}
              value={program.programEnd ? date.format(program.programEnd) : "—"}
            />
            <InsetRow
              icon={Users}
              tone="emerald"
              title={t("facts.participants")}
              value={t("participantsValue", { count: program._count.participants })}
            />
            <InsetRow icon={Award} tone="amber" title={t("facts.certificate")} subtitle={vars.certificate} />
          </InsetGroup>
        </Reveal>

        {content.length > 0 && (
          <Reveal index={2}>
            <h2 className="mb-3 flex items-center gap-2 px-1 text-[20px] font-bold tracking-[-0.4px] text-foreground">
              <FolderKanban className="h-5 w-5 text-primary" aria-hidden="true" />
              {t("facts.content")}
            </h2>
            <ul className="flex flex-wrap gap-2">
              {content.map((name) => (
                <li
                  key={name}
                  className="rounded-full bg-card px-3.5 py-1.5 text-[13px] font-medium text-foreground ring-1 ring-border/60"
                >
                  {name}
                </li>
              ))}
            </ul>
            <p className="mt-4 px-1 text-[14px] leading-relaxed text-muted-foreground">{t("during", vars)}</p>
          </Reveal>
        )}

        <Reveal
          index={3}
          as="section"
          className="rounded-[22px] bg-card p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)] ring-1 ring-border/60 sm:p-6"
        >
          <h2 className="text-[20px] font-bold tracking-[-0.4px] text-foreground">{t("scheduleHeading")}</h2>
          <div className="mt-4">
            {schedule.length > 0 ? (
              <ScheduleTable items={schedule} locale={locale} />
            ) : (
              <p className="text-sm text-muted-foreground">{t("noSchedule")}</p>
            )}
          </div>
          <p className="mt-4 text-sm text-muted-foreground">{t("certificateNote", vars)}</p>
        </Reveal>

        <Reveal index={4} as="section" className="rounded-[22px] bg-primary/8 p-5 ring-1 ring-primary/20 sm:p-6">
          <h2 className="text-[20px] font-bold tracking-[-0.4px] text-foreground">{t("ctaHeading")}</h2>
          <div className="mt-3 space-y-2 text-[14px] leading-relaxed text-muted-foreground">
            <p>{t("cta1")}</p>
            <p>{t("cta2")}</p>
            <p>{t("cta3")}</p>
          </div>
          <Link
            href="/participant/assessments"
            className="mt-5 inline-flex h-11 items-center rounded-xl bg-primary px-5 text-[15px] font-semibold text-primary-foreground transition-transform hover:bg-primary/90 active:scale-[0.98]"
          >
            {t("start")}
          </Link>
        </Reveal>
      </div>
    </DashboardLayout>
  );
}
