import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { formatDate } from "@/lib/format-date";
import { getThread, personName, SupportTicketNotFoundError, type SupportActor, type SupportStatus } from "@/lib/support/support-service";
import { SupportStatusPill } from "./support-status";
import { SupportThread } from "./support-thread";

/** A support conversation page, for either side of it. */
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
  const when = (d: Date) => `${formatDate(d, locale, "dayMonth")}, ${time.format(d)}`;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href={backHref} className="inline-flex items-center gap-1 text-[14px] font-medium text-primary hover:underline">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {t("back")}
      </Link>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[24px] font-bold leading-tight tracking-[-0.5px]">{ticket.subject}</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {viewer === "staff" ? `${ticket.tenant.name} · ` : ""}
            {t("openedBy", { name: personName(ticket.createdBy), date: formatDate(ticket.createdAt, locale, "medium") })}
          </p>
        </div>
        <SupportStatusPill status={ticket.status as SupportStatus} />
      </header>
      <SupportThread
        ticketId={ticket.id}
        apiBase={viewer === "staff" ? "/api/admin/support/tickets" : "/api/support/tickets"}
        viewer={viewer}
        canWrite={canWrite}
        status={ticket.status as SupportStatus}
        messages={ticket.messages.map((m) => ({ id: m.id, body: m.body, fromStaff: m.fromStaff, author: personName(m.author), when: when(m.createdAt) }))}
      />
    </div>
  );
}
