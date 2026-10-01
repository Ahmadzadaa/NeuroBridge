import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/auth-utils";
import { requireFeature } from "@/lib/tenant/require-feature";
import { prisma } from "@/lib/prisma";
import { computeRankings } from "@/lib/hackathon/ranking";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { LargeTitle } from "@/components/ui/ios";
import { RankingsTable } from "@/components/hackathon/rankings-table";

export default async function JuryRankingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireRole(locale, ["JURY"]);
  await requireFeature(session.user.tenantId, "hackathon");
  const t = await getTranslations("hackathon.rankings");

  const programs = await prisma.program.findMany({
    where: {
      type: "hackathon",
      ...(session.user.tenantId ? { tenantId: session.user.tenantId } : {}),
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true },
  });

  const rankingsByProgram = await Promise.all(
    programs.map(async (program) => ({
      program,
      rankings: await computeRankings(program.id),
    }))
  );

  return (
    <DashboardLayout
      panel="jury"
      title={t("heading")}
      userName={session.user.name ?? "Jury"}
    >
      <div className="space-y-8">
        <LargeTitle title={t("heading")} />
        {rankingsByProgram.map(({ program, rankings }) => (
          <section key={program.id} className="ios-reveal">
            <h2 className="mb-3 px-1 text-[20px] font-bold tracking-[-0.4px]">{program.name}</h2>
            <RankingsTable rankings={rankings} />
          </section>
        ))}
      </div>
    </DashboardLayout>
  );
}
