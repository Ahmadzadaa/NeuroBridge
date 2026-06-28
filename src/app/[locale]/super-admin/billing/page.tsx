import { setRequestLocale } from "next-intl/server";
import { requireRole } from "@/lib/auth-utils";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { getTranslations } from "next-intl/server";
import { Card, CardContent } from "@/components/ui/card";

export default async function BillingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireRole(locale, ["SUPER_ADMIN"]);
  const t = await getTranslations("superAdmin.billing");

  return (
    <DashboardLayout panel="super-admin" title={t("title")} userName={session.user.name ?? "Admin"}>
      <Card className="rounded-2xl border-0 shadow-sm">
        <CardContent className="p-6 text-muted-foreground">
          License & billing management — payment integration coming soon.
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
