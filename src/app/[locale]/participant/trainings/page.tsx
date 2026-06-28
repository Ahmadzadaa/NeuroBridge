import { setRequestLocale } from "next-intl/server";
import { requireRole } from "@/lib/auth-utils";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TRAINING_TYPES } from "@/lib/constants";

export default async function TrainingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireRole(locale, ["PARTICIPANT"]);
  const t = await getTranslations("participant.trainings");
  const tt = await getTranslations("tenant.trainingTypes");

  return (
    <DashboardLayout panel="participant" title={t("title")} userName={session.user.name ?? "Participant"}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {TRAINING_TYPES.map((training) => (
          <Card key={training} className="rounded-2xl border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">{tt(training)}</CardTitle>
            </CardHeader>
            <CardContent>
              <Button className="w-full rounded-xl">{t("takeExam")}</Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </DashboardLayout>
  );
}
