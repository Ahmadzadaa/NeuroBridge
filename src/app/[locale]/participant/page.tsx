import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  Award,
  BookOpen,
  Bot,
  CalendarDays,
  ClipboardCheck,
  Coins,
  FileText,
  Gamepad2,
  GraduationCap,
  Rocket,
  Trophy,
} from "lucide-react";
import { requireRole } from "@/lib/auth-utils";
import { getTenantFeatures } from "@/lib/tenant/features";
import { getParticipantHome } from "@/lib/participants/home";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { InsetGroup, InsetRow, Reveal } from "@/components/ui/ios";
import {
  HeroAction,
  MetricGrid,
  MetricTile,
  ProgressRing,
  SectionHeader,
  SectionLink,
  ShortcutGrid,
  WelcomeHero,
  type ShortcutItem,
} from "@/components/dashboard/dashboard-kit";

const INTL: Record<string, string> = { tr: "tr-TR", en: "en-GB", az: "az-Latn-AZ" };

/** The student's home: where they are in the programme and what is next. */
export default async function ParticipantPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireRole(locale, ["PARTICIPANT"]);
  const [t, tNav, tAct, home, features] = await Promise.all([
    getTranslations("participant.home"),
    getTranslations("nav.participant"),
    getTranslations("programSchedule.activities"),
    getParticipantHome(session.user.id),
    getTenantFeatures(session.user.tenantId),
  ]);

  const userName = session.user.name ?? "";
  const firstName = userName.split(" ")[0] || userName;
  const { program, timeline, lessons } = home;
  // tr-TR for az too: az-Latn month names differ between Node and browsers' ICU builds.
  const date = new Intl.DateTimeFormat(INTL[locale] === "az-Latn-AZ" ? "tr-TR" : INTL[locale] ?? "tr-TR", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });

  const status = !timeline
    ? t("noProgramText")
    : timeline.phase === "upcoming"
      ? t("startsIn", { count: timeline.daysLeft ?? 0 })
      : timeline.phase === "finished"
        ? t("finished")
        : timeline.phase === "running"
          ? t("weekStatus", { week: timeline.week ?? 1, total: 6, days: timeline.daysLeft ?? 0 })
          : t("undated");

  const shortcuts: (ShortcutItem & { on?: boolean })[] = [
    { href: "/participant/program", icon: CalendarDays, tone: "indigo", label: tNav("program") },
    { href: "/participant/assessments", icon: ClipboardCheck, tone: "sky", label: tNav("assessments") },
    { href: "/participant/units", icon: BookOpen, tone: "emerald", label: tNav("units"), on: features.simulations },
    { href: "/participant/simulations", icon: Gamepad2, tone: "violet", label: tNav("simulations"), on: features.simulations },
    { href: "/participant/trainings", icon: GraduationCap, tone: "amber", label: tNav("trainings"), on: features.trainings },
    { href: "/participant/hackathon", icon: Rocket, tone: "rose", label: tNav("hackathon"), on: features.hackathon },
    { href: "/participant/ai-tools", icon: Bot, tone: "fuchsia", label: tNav("aiTools"), on: features.aiTools },
    { href: "/participant/leaderboard", icon: Trophy, tone: "slate", label: tNav("leaderboard") },
  ];

  return (
    <DashboardLayout panel="participant" title={tNav("dashboard")} userName={userName} coinBalance={home.coins}>
      <div className="mx-auto max-w-5xl space-y-8">
        <WelcomeHero
          eyebrow={program ? program.tenant.name : undefined}
          title={t("greeting", { name: firstName })}
          subtitle={program ? `${program.name} · ${status}` : status}
          aside={
            program && timeline?.phase !== "undated" && <ProgressRing value={timeline?.percent ?? 0} caption={t("programLabel")} onDark responsive size={120} />
          }
        >
          {program && (
            <>
              <HeroAction href="/participant/units" primary>
                {t("continue")}
              </HeroAction>
              <HeroAction href="/participant/program">{t("openProgram")}</HeroAction>
            </>
          )}
        </WelcomeHero>

        <MetricGrid>
          <MetricTile
            index={1}
            icon={GraduationCap}
            tone="indigo"
            value={lessons.total ? `${lessons.done}/${lessons.total}` : "—"}
            label={t("lessons")}
            href={features.trainings ? "/participant/trainings" : undefined}
          />
          <MetricTile index={2} icon={Gamepad2} tone="violet" value={home.completedSimulations} label={t("simulations")} />
          <MetricTile index={3} icon={Award} tone="emerald" value={home.badges} label={t("badges")} href="/participant/badges" />
          <MetricTile index={4} icon={FileText} tone="amber" value={home.certificates} label={t("certificates")} href="/participant/certificates" />
        </MetricGrid>

        <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <Reveal as="section" index={5}>
            <SectionHeader title={t("upcoming")} action={program && <SectionLink href="/participant/program">{t("seeAll")}</SectionLink>} />
            <InsetGroup>
              {timeline && timeline.upcoming.length > 0 ? (
                timeline.upcoming.map((item) => {
                  const now = timeline.current?.activity === item.activity;
                  return (
                    <InsetRow
                      key={`${item.week}-${item.activity}`}
                      icon={item.activity === "JURY_PRESENTATION" ? Trophy : CalendarDays}
                      tone={now ? "indigo" : item.activity === "JURY_PRESENTATION" ? "amber" : "slate"}
                      title={tAct(item.activity)}
                      subtitle={`${t("weekN", { n: item.week })} · ${date.format(item.startsOn)} – ${date.format(item.endsOn)}`}
                      trailing={
                        now ? (
                          <span className="rounded-full bg-primary/12 px-2.5 py-0.5 text-[12px] font-semibold text-primary">{t("now")}</span>
                        ) : undefined
                      }
                    />
                  );
                })
              ) : (
                <p className="px-4 py-8 text-center text-[14px] text-muted-foreground">{program ? t("nothingUpcoming") : t("noProgramText")}</p>
              )}
            </InsetGroup>
          </Reveal>

          <Reveal as="section" index={6}>
            <SectionHeader title={t("wallet")} />
            <InsetGroup>
              <InsetRow icon={Coins} tone="amber" title={t("coins")} value={home.coins.toLocaleString(INTL[locale] === "az-Latn-AZ" ? "tr-TR" : INTL[locale])} />
              <InsetRow icon={Award} tone="emerald" title={t("badges")} value={home.badges} href="/participant/badges" />
              <InsetRow icon={Trophy} tone="violet" title={tNav("leaderboard")} href="/participant/leaderboard" />
            </InsetGroup>
          </Reveal>
        </div>

        <Reveal as="section" index={7}>
          <SectionHeader title={t("shortcuts")} />
          <ShortcutGrid items={shortcuts.filter((s) => s.on !== false)} />
        </Reveal>
      </div>
    </DashboardLayout>
  );
}
