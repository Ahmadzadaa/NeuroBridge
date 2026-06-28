import { setRequestLocale } from "next-intl/server";
import { requireRole } from "@/lib/auth-utils";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireRole(locale, ["PARTICIPANT"]);
  const t = await getTranslations("participant.profile");
  const tc = await getTranslations("common");

  return (
    <DashboardLayout panel="participant" title={t("title")} userName={session.user.name ?? "Participant"}>
      <Card className="mx-auto max-w-lg rounded-2xl border-0 shadow-sm">
        <CardHeader>
          <CardTitle>{t("personalInfo")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={session.user.email} readOnly className="rounded-xl" />
          </div>
          <div className="space-y-2">
            <Label>{t("language")}</Label>
            <Input value={session.user.language} readOnly className="rounded-xl" />
          </div>
          <Button className="rounded-xl">{tc("save")}</Button>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
