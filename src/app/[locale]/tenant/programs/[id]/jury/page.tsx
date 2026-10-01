import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireRole } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { getProgramJuryOverview } from "@/lib/jury/program-jury";
import { criterionLabel } from "@/lib/jury/criteria";
import { JuryError } from "@/lib/jury/jury-error";
import { JuryAdminClient } from "./jury-admin-client";

type Params = { params: Promise<{ locale: string; id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "tenant.jury" });
  return { title: `${t("title")} · BizSim` };
}

/** The organisation runs a programme's jury round: finalists, jurors, criteria, results. */
export default async function ProgramJuryPage({ params }: Params) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const session = await requireRole(locale, ["TENANT_ADMIN", "TENANT_VIEWER"]);
  const t = await getTranslations("tenant.jury");

  const overview = await getProgramJuryOverview(session.user.tenantId ?? "", id).catch((error) => {
    if (error instanceof JuryError) notFound();
    throw error;
  });
  const juryDay = await prisma.programScheduleItem.findFirst({
    where: { programId: id, activity: "JURY_PRESENTATION" },
    select: { id: true, startsOn: true },
  });

  const selected = new Set(overview.finalists.map((f) => f.userId));
  const resultById = new Map(overview.results.map((r) => [r.finalistId, r]));

  return (
    <DashboardLayout panel="tenant" title={t("title")} userName={session.user.name ?? ""}>
      <JuryAdminClient
        programId={id}
        programName={overview.program.name}
        canManage={session.user.role === "TENANT_ADMIN"}
        juryEnabled={overview.program.juryEnabled}
        finalistCount={overview.program.finalistCount}
        confirmedAt={overview.program.finalistsConfirmedAt?.toISOString() ?? null}
        juryDay={juryDay ? { id: juryDay.id, date: juryDay.startsOn.toISOString().slice(0, 10) } : null}
        ranking={overview.ranking.map((r) => ({
          userId: r.userId,
          name: r.name,
          email: r.email,
          university: r.university,
          points: r.points,
          rank: r.rank,
          selected: selected.has(r.userId),
        }))}
        jurors={overview.jurors.map((j) => ({
          id: j.id,
          name: [j.firstName, j.lastName].filter(Boolean).join(" ") || j.email,
          email: j.email,
          headline: j.headline,
          hasAvatar: Boolean(j.avatarPath),
          profileComplete: Boolean(j.avatarPath && j.headline && j.bio),
        }))}
        criteria={overview.criteria.map((c) => ({
          id: c.id,
          label: criterionLabel(c, locale),
          nameAz: c.nameAz ?? c.name,
          nameEn: c.nameEn ?? c.name,
          nameTr: c.nameTr ?? c.name,
          maxScore: c.maxScore,
          weight: c.weight,
        }))}
        scoringStarted={overview.finalists.some((f) => f.scores.length > 0)}
        results={overview.finalists
          .map((f) => {
            const r = resultById.get(f.id)!;
            return {
              finalistId: f.id,
              name: [f.user.firstName, f.user.lastName].filter(Boolean).join(" ") || f.user.email,
              university: f.user.university,
              platformRank: f.platformRank,
              total: r.total,
              rank: r.rank,
              averages: r.averages,
              submitted: overview.submittedBy.get(f.id) ?? 0,
            };
          })
          .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999))}
      />
    </DashboardLayout>
  );
}
