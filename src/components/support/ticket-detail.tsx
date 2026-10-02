import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ChevronLeft } from "lucide-react";
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

  return (
    <div className={cn("mx-auto space-y-5", staff ? "max-w-6xl" : "max-w-3xl")}>
      <Link href={backHref} className="-ml-1 inline-flex items-center text-[15px] font-medium text-primary hover:opacity-80">
        <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        {t("back")}
      </Link>

      <div className={cn(staff && "grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]")}>
        <div className="min-w-0 space-y-5">
          <header className="ios-reveal space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <SupportStatusPill status={ticket.status as SupportStatus} />
              <span className="text-[13px] text-muted-foreground">
                {staff ? `${ticket.tenant.name} · ` : ""}
                {t("openedBy", { name: personName(ticket.createdBy), date: formatDate(ticket.createdAt, locale, "medium") })}
              </span>
            </div>
            <h1 className="text-[26px] font-bold leading-tight tracking-[-0.6px] sm:text-[30px]">{ticket.subject}</h1>
          </header>
          <SupportThread
            ticketId={ticket.id}
            apiBase={staff ? "/api/admin/support/tickets" : "/api/support/tickets"}
            viewer={viewer}
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
