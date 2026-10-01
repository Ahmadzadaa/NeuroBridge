import { getTranslations, setRequestLocale } from "next-intl/server";
import { CheckCircle2, ChevronRight, CircleDashed, FileText, PenLine, UserRound, Users } from "lucide-react";
import { requireRole } from "@/lib/auth-utils";
import { hasFeature } from "@/lib/tenant/features";
import { prisma } from "@/lib/prisma";
import { Link } from "@/i18n/navigation";
import { getJurorWorkload } from "@/lib/jury/juror-service";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { InsetGroup, InsetRow, Reveal } from "@/components/ui/ios";
import { HeroAction, ProgressRing, WelcomeHero } from "@/components/dashboard/dashboard-kit";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/ui/user-avatar";
import { formatDate } from "@/lib/format-date";

/** Hackathon submissions this juror still has to score, when the organisation runs hackathons. */
async function hackathonEntries(tenantId: string | null, juryUserId: string) {
  if (!(await hasFeature(tenantId, "hackathon"))) return [];
  const programs = await prisma.program.findMany({
    where: { type: "hackathon", ...(tenantId ? { tenantId } : {}) },
    select: { id: true, name: true },
  });
  const programIds = programs.map((p) => p.id);
  const [teams, criteria, myScores] = await Promise.all([
    prisma.hackathonTeam.findMany({
      where: { programId: { in: programIds } },
      include: { submissions: { orderBy: { version: "desc" }, take: 1 }, _count: { select: { members: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.juryCriterion.findMany({ where: { programId: { in: programIds } }, select: { programId: true } }),
    prisma.juryScore.findMany({ where: { juryUserId }, select: { submissionId: true } }),
  ]);
  const criteriaCount = (programId: string) => criteria.filter((c) => c.programId === programId).length;
  const scored = (submissionId: string) => myScores.filter((s) => s.submissionId === submissionId).length;
  const programName = new Map(programs.map((p) => [p.id, p.name]));
  return teams
    .filter((team) => team.submissions.length > 0)
    .map((team) => {
      const submission = team.submissions[0];
      const total = criteriaCount(team.programId);
      return {
        submissionId: submission.id,
        title: submission.title,
        teamName: team.name,
        memberCount: team._count.members,
        programName: programName.get(team.programId) ?? "",
        done: total > 0 && scored(submission.id) >= total,
      };
    });
}

/** The juror's home: finalists to evaluate, profile status and any hackathon work. */
export default async function JuryDashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireRole(locale, ["JURY"]);
  const [t, me, programs, entries] = await Promise.all([
    getTranslations("juryHome"),
    prisma.user.findUniqueOrThrow({ where: { id: session.user.id }, select: { headline: true, bio: true, avatarPath: true } }),
    getJurorWorkload(session.user.id),
    hackathonEntries(session.user.tenantId ?? null, session.user.id),
  ]);

  const finalists = programs.flatMap((p) => p.finalists);
  const done = finalists.filter((f) => f.status === "SUBMITTED").length + entries.filter((e) => e.done).length;
  const total = finalists.length + entries.length;
  const profileComplete = Boolean(me.avatarPath && me.headline && me.bio);
  const firstName = (session.user.name ?? "").split(" ")[0];
  const date = { format: (value: Date | string) => formatDate(value, locale, "long") };
  const STATUS = {
    SUBMITTED: { icon: CheckCircle2, cls: "bg-success/12 text-success" },
    DRAFT: { icon: PenLine, cls: "bg-warning/15 text-warning-dark" },
    TODO: { icon: CircleDashed, cls: "bg-muted text-muted-foreground" },
  } as const;

  return (
    <DashboardLayout panel="jury" title={t("title")} userName={session.user.name ?? ""}>
      <div className="mx-auto max-w-4xl space-y-8">
        <WelcomeHero
          eyebrow={t("title")}
          title={t("greeting", { name: firstName })}
          subtitle={total ? t("progress", { done, total }) : t("nothingYet")}
          aside={total > 0 && <ProgressRing value={(done / total) * 100} label={`${done}/${total}`} caption={t("evaluated")} onDark responsive size={120} />}
        >
          {!profileComplete && (
            <HeroAction href="/jury/profile" primary>
              {t("completeProfile")}
            </HeroAction>
          )}
        </WelcomeHero>

        {!profileComplete && (
          <Reveal index={1}>
            <InsetGroup footer={t("profileFooter")}>
              <InsetRow href="/jury/profile" icon={UserRound} tone="amber" title={t("profileTitle")} subtitle={t("profileHint")} />
            </InsetGroup>
          </Reveal>
        )}

        {programs.map((program, i) => (
          <Reveal key={program.id} index={i + 2} as="section">
            <div className="mb-3 px-1">
              <p className="text-[13px] font-semibold text-primary">{program.organisation}</p>
              <h2 className="text-[20px] font-bold tracking-[-0.4px]">{program.name}</h2>
              {program.juryDate && <p className="text-[13px] text-muted-foreground">{t("juryDay", { date: date.format(program.juryDate) })}</p>}
            </div>
            <ul className="space-y-2.5">
              {program.finalists.map((f) => {
                const s = STATUS[f.status];
                return (
                  <li key={f.id}>
                    <Link
                      href={`/jury/finalists/${f.id}`}
                      className="group flex items-center gap-3 rounded-[20px] bg-card p-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)] ring-1 ring-border/60 transition-transform duration-300 hover:-translate-y-0.5"
                    >
                      <UserAvatar userId={f.userId} name={f.name} hasAvatar={f.hasAvatar} className="h-11 w-11 text-[14px]" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-semibold">{f.name}</span>
                        {f.university && <span className="block truncate text-[13px] text-muted-foreground">{f.university}</span>}
                      </span>
                      <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-semibold", s.cls)}>
                        <s.icon className="h-3.5 w-3.5" aria-hidden="true" />
                        {t(`status.${f.status}`)}
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Reveal>
        ))}

        {entries.length > 0 && (
          <Reveal index={programs.length + 2}>
            <InsetGroup header={t("hackathon")}>
              {entries.map((e) => (
                <InsetRow
                  key={e.submissionId}
                  href={`/jury/submissions/${e.submissionId}`}
                  icon={e.done ? CheckCircle2 : FileText}
                  tone={e.done ? "emerald" : "indigo"}
                  title={e.title}
                  subtitle={`${e.teamName} · ${e.programName}`}
                  trailing={
                    <span className="inline-flex shrink-0 items-center gap-1 text-[12px] text-muted-foreground">
                      <Users className="h-3.5 w-3.5" aria-hidden="true" />
                      {e.memberCount}
                    </span>
                  }
                />
              ))}
            </InsetGroup>
          </Reveal>
        )}

        {total === 0 && (
          <p className="rounded-[22px] bg-card px-6 py-12 text-center text-[14px] text-muted-foreground ring-1 ring-border/60">{t("empty")}</p>
        )}
      </div>
    </DashboardLayout>
  );
}
