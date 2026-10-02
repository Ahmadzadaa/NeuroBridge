import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireRole } from "@/lib/auth-utils";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { TicketDetail } from "@/components/support/ticket-detail";

export default async function SupportTicketPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const session = await requireRole(locale, ["SUPER_ADMIN"]);
  const t = await getTranslations("support");
  return (
    <DashboardLayout panel="super-admin" title={t("title")} userName={session.user.name ?? "Admin"}>
      <TicketDetail
        actor={{ id: session.user.id, role: session.user.role, tenantId: session.user.tenantId ?? null }}
        ticketId={id}
        locale={locale}
        viewer="staff"
        canWrite
        backHref="/super-admin/support"
      />
    </DashboardLayout>
  );
}
