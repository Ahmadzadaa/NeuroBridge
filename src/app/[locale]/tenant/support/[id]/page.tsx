import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireRole } from "@/lib/auth-utils";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { TicketDetail } from "@/components/support/ticket-detail";

export default async function TenantSupportTicketPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const session = await requireRole(locale, ["TENANT_ADMIN", "TENANT_VIEWER"]);
  const t = await getTranslations("support");
  return (
    <DashboardLayout panel="tenant" title={t("title")} userName={session.user.name ?? ""}>
      <TicketDetail
        actor={{ id: session.user.id, role: session.user.role, tenantId: session.user.tenantId ?? null }}
        ticketId={id}
        locale={locale}
        viewer="tenant"
        canWrite={session.user.role === "TENANT_ADMIN"}
        backHref="/tenant/support"
      />
    </DashboardLayout>
  );
}
