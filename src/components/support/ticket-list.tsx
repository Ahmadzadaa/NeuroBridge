import type { CSSProperties } from "react";
import { getTranslations } from "next-intl/server";
import { ChevronRight, LifeBuoy } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { formatDate } from "@/lib/format-date";
import type { SupportStatus } from "@/lib/support/support-service";
import { cn } from "@/lib/utils";
import { SupportStatusPill } from "./support-status";

export type TicketRow = {
  id: string;
  subject: string;
  status: SupportStatus;
  lastMessageAt: Date;
  unread: boolean;
  /** Who and where: the organisation for the platform team, the author for the organisation. */
  meta: string;
  messages: number;
};

export const SUPPORT_CARD = "rounded-[22px] bg-card ring-1 ring-border/60 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)]";

export async function TicketList({ rows, hrefBase, locale, empty }: { rows: TicketRow[]; hrefBase: string; locale: string; empty: string }) {
  const t = await getTranslations("support");
  const time = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Baku" });

  if (rows.length === 0) {
    return (
      <div className={cn(SUPPORT_CARD, "flex flex-col items-center gap-3 px-4 py-14 text-center")}>
        <LifeBuoy className="h-8 w-8 text-muted-foreground/60" aria-hidden="true" />
        <p className="max-w-sm text-[14px] text-muted-foreground">{empty}</p>
      </div>
    );
  }

  return (
    <ul className={cn(SUPPORT_CARD, "overflow-hidden")}>
      {rows.map((row, i) => (
        <li key={row.id} style={{ "--i": i } as CSSProperties} className="border-t border-border/60 first:border-t-0">
          <Link href={`${hrefBase}/${row.id}`} className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted/40 sm:px-5">
            <span
              className={cn("h-2 w-2 shrink-0 rounded-full", row.unread ? "bg-primary" : "bg-transparent")}
              aria-label={row.unread ? t("unread") : undefined}
              role={row.unread ? "img" : undefined}
            />
            <span className="min-w-0 flex-1">
              <span className={cn("block truncate text-[15px]", row.unread ? "font-bold text-foreground" : "font-medium text-foreground/90")}>{row.subject}</span>
              <span className="mt-0.5 block truncate text-[12px] text-muted-foreground">
                {row.meta} · {t("messageCount", { count: row.messages })}
              </span>
            </span>
            <span className="hidden text-right text-[12px] tabular-nums text-muted-foreground sm:block">
              {formatDate(row.lastMessageAt, locale, "dayMonth")}, {time.format(row.lastMessageAt)}
            </span>
            <SupportStatusPill status={row.status} />
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" aria-hidden="true" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
