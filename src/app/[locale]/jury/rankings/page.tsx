import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Trophy } from "lucide-react";
import { requireRole } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { hasFeature } from "@/lib/tenant/features";
import { computeRankings } from "@/lib/hackathon/ranking";
import { getJurorRankings } from "@/lib/jury/juror-service";
import { Link } from "@/i18n/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { LargeTitle } from "@/components/ui/ios";
import { UserAvatar } from "@/components/ui/user-avatar";
import { LiveRefresh } from "@/components/ui/live-refresh";
import { RankingsTable } from "@/components/hackathon/rankings-table";
import { cn } from "@/lib/utils";

type Props = { params: Promise<{ locale: string }> };

const MEDAL = ["from-amber-300 to-amber-500 text-amber-950", "from-slate-200 to-slate-400 text-slate-900", "from-orange-300 to-orange-500 text-orange-950"];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "juryRankings" });
  return { title: `${t("title")} · BizSim` };
}

/**
 * Live ranking for the jury: the finalists of every programme the juror sits
 * on, ordered by their submitted jury scores, plus hackathon team rankings
 * when the organisation runs hackathons. Refreshes itself while open.
 */
export default async function JuryRankingsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireRole(locale, ["JURY"]);
  const [t, th] = await Promise.all([getTranslations("juryRankings"), getTranslations("hackathon.rankings")]);
  const tenantId = session.user.tenantId ?? null;

  const [programs, hackathonOn] = await Promise.all([getJurorRankings(session.user.id), hasFeature(tenantId, "hackathon")]);
  const hackathons = hackathonOn
    ? await Promise.all(
        (
          await prisma.program.findMany({
            where: { type: "hackathon", ...(tenantId ? { tenantId } : {}) },
            orderBy: { createdAt: "desc" },
            select: { id: true, name: true },
          })
        ).map(async (program) => ({ program, rankings: await computeRankings(program.id) }))
      )
    : [];

  return (
    <DashboardLayout panel="jury" title={t("title")} userName={session.user.name ?? "Jury"}>
      <LiveRefresh seconds={30} />
      <div className="mx-auto max-w-3xl space-y-8">
        <LargeTitle title={t("title")} subtitle={t("subtitle")} />

        {programs.length === 0 && hackathons.length === 0 && (
          <p className="rounded-[22px] bg-card px-4 py-10 text-center text-[14px] text-muted-foreground ring-1 ring-border/60">{t("empty")}</p>
        )}

        {programs.map((program) => (
          <section key={program.id} className="space-y-3">
            <div className="px-1">
              <p className="text-[13px] font-semibold text-primary">{program.organisation}</p>
              <h2 className="text-[20px] font-bold tracking-[-0.4px]">{program.name}</h2>
            </div>
            <ol className="overflow-hidden rounded-[22px] bg-card ring-1 ring-border/60">
              {program.rows.map((row, i) => (
                <li
                  key={row.finalistId}
                  style={{ "--i": i } as CSSProperties}
                  className={cn("ios-reveal border-t border-border/60 first:border-t-0", row.rank === null && "opacity-70")}
                >
                  <Link href={`/jury/finalists/${row.finalistId}`} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40">
                    <span
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-bold tabular-nums",
                        row.rank && row.rank <= 3 ? cn("bg-gradient-to-br", MEDAL[row.rank - 1]) : "bg-muted text-muted-foreground"
                      )}
                      aria-label={row.rank ? t("rank", { rank: row.rank }) : t("notRanked")}
                    >
                      {row.rank ?? "–"}
                    </span>
                    <UserAvatar userId={row.userId} name={row.name} hasAvatar={row.hasAvatar} className="h-10 w-10 text-[13px]" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-semibold">{row.name}</span>
                      <span className="block text-[12px] text-muted-foreground">
                        {t("jurorsScored", { done: row.jurorsScored, total: program.jurors })}
                      </span>
                    </span>
                    <span className="text-right">
                      {row.total === null ? (
                        <span className="text-[13px] text-muted-foreground">{t("noScores")}</span>
                      ) : (
                        <span className="flex items-baseline gap-1">
                          <span className="text-[22px] font-bold tabular-nums tracking-[-0.5px]">{row.total.toLocaleString(locale === "en" ? "en-GB" : "tr-TR")}</span>
                          <span className="text-[12px] text-muted-foreground">/100</span>
                        </span>
                      )}
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </section>
        ))}

        {hackathons.map(({ program, rankings }) => (
          <section key={program.id} className="space-y-3">
            <h2 className="flex items-center gap-2 px-1 text-[20px] font-bold tracking-[-0.4px]">
              <Trophy className="h-5 w-5 text-amber-500" aria-hidden="true" />
              {program.name}
              <span className="text-[13px] font-medium text-muted-foreground">· {th("heading")}</span>
            </h2>
            <RankingsTable rankings={rankings} />
          </section>
        ))}

        <p className="px-1 text-[12px] leading-relaxed text-muted-foreground">{t("note")}</p>
      </div>
    </DashboardLayout>
  );
}
