import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireRole } from "@/lib/auth-utils";
import { Link } from "@/i18n/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { LargeTitle } from "@/components/ui/ios";
import { TicketList } from "@/components/support/ticket-list";
import { isUnread, listAllTickets, personName, SUPPORT_STATUSES, type SupportStatus } from "@/lib/support/support-service";
import { cn } from "@/lib/utils";

/** The platform team's support inbox. Open tickets (waiting on us) come first by default. */
export default async function SupportPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireRole(locale, ["SUPER_ADMIN"]);
  const t = await getTranslations("support");
  const raw = (await searchParams).status;
  const status = raw === "all" ? null : SUPPORT_STATUSES.includes(raw as SupportStatus) ? (raw as SupportStatus) : "OPEN";
  const { tickets, counts } = await listAllTickets(status);
  const all = SUPPORT_STATUSES.reduce((n, s) => n + counts[s], 0);

  const filters: { key: SupportStatus | "all"; label: string; count: number }[] = [
    ...SUPPORT_STATUSES.map((s) => ({ key: s, label: t(`status.${s}`), count: counts[s] })),
    { key: "all", label: t("all"), count: all },
  ];

  return (
    <DashboardLayout panel="super-admin" title={t("title")} userName={session.user.name ?? "Admin"}>
      <div className="mx-auto max-w-4xl space-y-6">
        <LargeTitle title={t("title")} subtitle={t("staffSubtitle")} />
        <nav aria-label={t("filterLabel")} className="flex flex-wrap gap-2">
          {filters.map((f) => {
            const active = (status ?? "all") === f.key;
            return (
              <Link
                key={f.key}
                href={`/super-admin/support?status=${f.key}`}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex h-9 items-center gap-2 rounded-full px-4 text-[13px] font-semibold transition-colors",
                  active ? "bg-primary text-primary-foreground" : "bg-card text-foreground ring-1 ring-border/60 hover:bg-muted/60"
                )}
              >
                {f.label}
                <span className={cn("rounded-full px-1.5 text-[11px] tabular-nums", active ? "bg-white/20" : "bg-muted text-muted-foreground")}>{f.count}</span>
              </Link>
            );
          })}
        </nav>
        <TicketList
          locale={locale}
          hrefBase="/super-admin/support"
          empty={status === "OPEN" ? t("staffEmptyOpen") : t("emptyFiltered")}
          rows={tickets.map((ticket) => ({
            id: ticket.id,
            subject: ticket.subject,
            status: ticket.status as SupportStatus,
            lastMessageAt: ticket.lastMessageAt,
            unread: isUnread(ticket.lastMessageAt, ticket.staffReadAt),
            meta: `${ticket.tenant.name} · ${personName(ticket.createdBy)}`,
            messages: ticket._count.messages,
            avatar: { id: ticket.tenant.id, name: ticket.tenant.name },
          }))}
        />
      </div>
    </DashboardLayout>
  );
}
