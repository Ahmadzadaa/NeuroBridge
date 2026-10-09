import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireRole } from "@/lib/auth-utils";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { getFinalistFile } from "@/lib/jury/juror-service";
import { JuryError } from "@/lib/jury/jury-error";
import { ScoreSheet } from "./score-sheet";
import { formatDate } from "@/lib/format-date";

type Params = { params: Promise<{ locale: string; id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "juryScore" });
  return { title: `${t("title")} · BizSim` };
}

/** A finalist's file and the juror's scoring sheet. */
export default async function FinalistScorePage({ params }: Params) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const session = await requireRole(locale, ["JURY"]);
  const t = await getTranslations("juryScore");

  const file = await getFinalistFile(session.user.id, id, locale).catch((error) => {
    if (error instanceof JuryError) notFound();
    throw error;
  });
  const date = { format: (value: Date | string) => formatDate(value, locale, "medium") };

  return (
    <DashboardLayout panel="jury" title={t("title")} userName={session.user.name ?? ""}>
      <ScoreSheet
        finalistId={file.finalist.id}
        finalist={{
          name: file.finalist.name,
          userId: file.finalist.userId,
          hasAvatar: file.finalist.hasAvatar,
          details: [
            file.finalist.university,
            file.finalist.faculty,
            file.finalist.specialty,
            file.finalist.studyYear ? t("studyYear", { year: file.finalist.studyYear }) : null,
          ].filter((x): x is string => Boolean(x)),
          platformScore: file.finalist.platformScore,
          platformRank: file.finalist.platformRank,
        }}
        programName={file.program.name}
        criteria={file.criteria}
        projects={file.projects.map((p) => ({ ...p, updatedAt: date.format(p.updatedAt) }))}
        initialScores={file.scores}
        initialComment={file.comment}
        submitted={Boolean(file.submittedAt)}
      />
    </DashboardLayout>
  );
}
