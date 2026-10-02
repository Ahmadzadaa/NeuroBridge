import { getTranslations, setRequestLocale } from "next-intl/server";
import { Plus } from "lucide-react";
import { requireRole } from "@/lib/auth-utils";
import { Link } from "@/i18n/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { LargeTitle } from "@/components/ui/ios";
import { buttonVariants } from "@/components/ui/button";
import { TicketList } from "@/components/support/ticket-list";
import { isUnread, listTenantTickets, personName, type SupportStatus } from "@/lib/support/support-service";

/** The organisation's conversations with the platform team. */
export default async function TenantSupportPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireRole(locale, ["TENANT_ADMIN", "TENANT_VIEWER"]);
  const t = await getTranslations("support");
  const tickets = session.user.tenantId ? await listTenantTickets(session.user.tenantId) : [];
  const canWrite = session.user.role === "TENANT_ADMIN";

  return (
    <DashboardLayout panel="tenant" title={t("title")} userName={session.user.name ?? ""}>
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <LargeTitle title={t("title")} subtitle={t("tenantSubtitle")} />
          {canWrite && (
            <Link href="/tenant/support/new" className={buttonVariants()}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              {t("newTicket")}
            </Link>
          )}
        </div>
        <TicketList
          locale={locale}
          hrefBase="/tenant/support"
          empty={t("tenantEmpty")}
          rows={tickets.map((ticket) => ({
            id: ticket.id,
            subject: ticket.subject,
            status: ticket.status as SupportStatus,
            lastMessageAt: ticket.lastMessageAt,
            unread: isUnread(ticket.lastMessageAt, ticket.tenantReadAt),
            meta: personName(ticket.createdBy),
            messages: ticket._count.messages,
            avatar: { id: ticket.createdBy.id, name: personName(ticket.createdBy) },
          }))}
        />
      </div>
    </DashboardLayout>
  );
}
