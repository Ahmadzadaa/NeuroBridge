import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth-utils";
import { Link } from "@/i18n/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { LargeTitle } from "@/components/ui/ios";
import { NewTicketForm } from "@/components/support/new-ticket-form";

export default async function NewSupportTicketPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireRole(locale, ["TENANT_ADMIN"]);
  const t = await getTranslations("support");
  return (
    <DashboardLayout panel="tenant" title={t("title")} userName={session.user.name ?? ""}>
      <div className="mx-auto max-w-2xl space-y-6">
        <Link href="/tenant/support" className="inline-flex items-center gap-1 text-[14px] font-medium text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {t("back")}
        </Link>
        <LargeTitle title={t("newTicket")} subtitle={t("newTicketSubtitle")} />
        <NewTicketForm />
      </div>
    </DashboardLayout>
  );
}
