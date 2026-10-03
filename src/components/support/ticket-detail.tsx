import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { CheckCircle2, ChevronLeft, Clock, MessageCircleReply } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { formatDate } from "@/lib/format-date";
import { getThread, personName, SupportTicketNotFoundError, type SupportActor, type SupportStatus } from "@/lib/support/support-service";
import { cn } from "@/lib/utils";
import { SupportStatusPill } from "./support-status";
import { SupportThread } from "./support-thread";
import { TicketInspector } from "./ticket-inspector";

/**
 * A support conversation page, for either side of it. The platform team also
 * gets the inspector: who wrote, their organisation and the technical details.
 */
export async function TicketDetail({
  actor,
  ticketId,
  locale,
  viewer,
  canWrite,
  backHref,
}: {
  actor: SupportActor;
  ticketId: string;
  locale: string;
  viewer: "staff" | "tenant";
  canWrite: boolean;
  backHref: string;
}) {
  const t = await getTranslations("support");
  const ticket = await getThread(actor, ticketId).catch((error) => {
    if (error instanceof SupportTicketNotFoundError) notFound();
    throw error;
  });
  const time = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Baku" });
  const staff = viewer === "staff";
  const look = {
    OPEN: { icon: Clock, tile: "from-amber-400 to-orange-500" },
    ANSWERED: { icon: MessageCircleReply, tile: "from-indigo-500 to-violet-600" },
    RESOLVED: { icon: CheckCircle2, tile: "from-emerald-400 to-teal-600" },
  }[ticket.status as SupportStatus] ?? { icon: Clock, tile: "from-amber-400 to-orange-500" };
  const LookIcon = look.icon;

  return (
    <div className={cn("mx-auto space-y-5", staff ? "max-w-6xl" : "max-w-3xl")}>
      <Link href={backHref} className="-ml-1 inline-flex items-center text-[15px] font-medium text-primary hover:opacity-80">
        <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        {t("back")}
      </Link>

      <div className={cn(staff && "grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]")}>
        <div className="min-w-0 space-y-5">
          <header className="ios-reveal flex items-start gap-4 rounded-[22px] bg-card p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)] ring-1 ring-border/60">
            <span className={cn("hidden h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-gradient-to-br text-white shadow-sm sm:flex", look.tile)} aria-hidden="true">
              <LookIcon className="h-6 w-6" strokeWidth={2.2} />
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="text-[22px] font-bold leading-tight tracking-[-0.4px] sm:text-[24px]">{ticket.subject}</h1>
              <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted-foreground">
                {staff && <span className="font-medium text-foreground/80">{ticket.tenant.name}</span>}
                {staff && <span aria-hidden="true">·</span>}
                <span>{t("openedBy", { name: personName(ticket.createdBy), date: formatDate(ticket.createdAt, locale, "medium") })}</span>
                <span aria-hidden="true">·</span>
                <span>{t("messageCount", { count: ticket.messages.length })}</span>
              </p>
            </div>
            <SupportStatusPill status={ticket.status as SupportStatus} />
          </header>
          <SupportThread
            ticketId={ticket.id}
            apiBase={staff ? "/api/admin/support/tickets" : "/api/support/tickets"}
            viewer={viewer}
            viewerId={actor.id}
            canWrite={canWrite}
            status={ticket.status as SupportStatus}
            messages={ticket.messages.map((m) => ({
              id: m.id,
              body: m.body,
              fromStaff: m.fromStaff,
              author: personName(m.author),
              authorId: m.author.id,
              day: formatDate(m.createdAt, locale, "long"),
              time: time.format(m.createdAt),
              attachments: m.attachments,
              sentAt: m.createdAt.toISOString(),
              edited: m.editedAt !== null,
              deleted: m.deletedAt !== null,
            }))}
          />
        </div>
        {staff && (
          <div className="mt-6 lg:mt-0">
            <TicketInspector ticketId={ticket.id} locale={locale} />
          </div>
        )}
      </div>
    </div>
  );
}
