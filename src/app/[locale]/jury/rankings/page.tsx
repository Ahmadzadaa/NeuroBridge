import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { computeRankings } from "@/lib/hackathon/ranking";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { RankingsTable } from "@/components/hackathon/rankings-table";

export default async function JuryRankingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireRole(locale, ["JURY"]);
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
        {rankingsByProgram.map(({ program, rankings }) => (
          <section key={program.id}>
            <h2 className="mb-3 text-[15px] font-semibold">{program.name}</h2>
            <RankingsTable rankings={rankings} />
          </section>
        ))}
      </div>
    </DashboardLayout>
  );
}
