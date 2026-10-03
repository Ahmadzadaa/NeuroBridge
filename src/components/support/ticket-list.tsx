import type { CSSProperties } from "react";
import { getTranslations } from "next-intl/server";
import { CheckCircle2, ChevronRight, Clock, LifeBuoy, MessageCircleReply } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { UserAvatar } from "@/components/ui/user-avatar";
import { formatDate } from "@/lib/format-date";
import type { SupportStatus } from "@/lib/support/support-service";
import { cn } from "@/lib/utils";

export type TicketRow = {
  id: string;
  subject: string;
  status: SupportStatus;
  lastMessageAt: Date;
  unread: boolean;
  /** Who and where: the organisation for the platform team, the author for the organisation. */
  meta: string;
  messages: number;
  /** The newest message, previewed under the subject like a mail inbox. */
  preview: { body: string; fromStaff: boolean; _count?: { attachments: number } } | null;
  /** Shown for the platform team, where the organisation is the face of the row; omitted for the organisation itself. */
  avatar?: { id: string; name: string };
};

export const SUPPORT_CARD = "rounded-[22px] bg-card ring-1 ring-border/60 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)]";

const STATUS_LOOK: Record<SupportStatus, { icon: typeof Clock; tile: string; text: string }> = {
  OPEN: { icon: Clock, tile: "from-amber-400 to-orange-500", text: "text-amber-700 dark:text-amber-400" },
  ANSWERED: { icon: MessageCircleReply, tile: "from-indigo-500 to-violet-600", text: "text-primary" },
  RESOLVED: { icon: CheckCircle2, tile: "from-emerald-400 to-teal-600", text: "text-emerald-700 dark:text-emerald-400" },
};

/**
 * A mail-style inbox: subject and time on top, the latest message under it,
 * and a coloured status mark. Unread threads are bold with a blue dot.
 */
export async function TicketList({
  rows,
  hrefBase,
  locale,
  empty,
  viewer,
}: {
  rows: TicketRow[];
  hrefBase: string;
  locale: string;
  empty: string;
  viewer: "staff" | "tenant";
}) {
  const t = await getTranslations("support");
  const time = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Baku" });
  const today = formatDate(new Date(), locale, "dayMonth");
  const when = (d: Date) => (formatDate(d, locale, "dayMonth") === today ? time.format(d) : formatDate(d, locale, "dayMonth"));

  if (rows.length === 0) {
    return (
      <div className={cn(SUPPORT_CARD, "flex flex-col items-center gap-3 px-6 py-16 text-center")}>
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <LifeBuoy className="h-6 w-6" aria-hidden="true" />
        </span>
        <p className="max-w-sm text-[15px] text-muted-foreground">{empty}</p>
      </div>
    );
  }

  return (
    <ul className={cn(SUPPORT_CARD, "overflow-hidden")}>
      {rows.map((row, i) => {
        const look = STATUS_LOOK[row.status] ?? STATUS_LOOK.OPEN;
        const StatusIcon = look.icon;
        // "You:" for your own last word, the team's name for theirs, as in a messages app.
        const mine = row.preview && (viewer === "staff") === row.preview.fromStaff;
        const who = row.preview ? (mine ? t("previewYou") : row.preview.fromStaff ? t("previewTeam") : null) : null;
        return (
          <li key={row.id} style={{ "--i": i } as CSSProperties} className="ios-reveal border-t border-border/50 first:border-t-0">
            <Link href={`${hrefBase}/${row.id}`} className="group flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-muted/40 active:bg-muted sm:px-5">
              <span className="flex w-2.5 shrink-0 justify-center pt-[18px]">
                {row.unread && <span role="img" aria-label={t("unread")} className="h-2.5 w-2.5 rounded-full bg-primary" />}
              </span>
              {row.avatar ? (
                <UserAvatar userId={row.avatar.id} name={row.avatar.name} hasAvatar={false} className="h-11 w-11 text-[15px]" />
              ) : (
                <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-white shadow-sm", look.tile)} aria-hidden="true">
                  <StatusIcon className="h-5 w-5" strokeWidth={2.2} />
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-3">
                  <span className={cn("min-w-0 truncate text-[15px]", row.unread ? "font-bold text-foreground" : "font-semibold text-foreground/90")}>{row.subject}</span>
                  <span className={cn("shrink-0 text-[12px] tabular-nums", row.unread ? "font-semibold text-primary" : "text-muted-foreground")}>{when(row.lastMessageAt)}</span>
                </span>
                {row.preview && (
                  <span className={cn("mt-0.5 line-clamp-2 text-[14px] leading-snug", row.unread ? "text-foreground/80" : "text-muted-foreground")}>
                    {who && <span className="font-medium text-foreground/70">{who}: </span>}
                    {row.preview.body || t("previewAttachments", { count: row.preview._count?.attachments ?? 0 })}
                  </span>
                )}
                <span className="mt-1.5 flex items-center gap-2 text-[12px] text-muted-foreground">
                  <span className={cn("inline-flex items-center gap-1 font-semibold", look.text)}>
                    <StatusIcon className="h-3.5 w-3.5" aria-hidden="true" />
                    {t(`status.${row.status}`)}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="truncate">{row.meta}</span>
                  <span aria-hidden="true">·</span>
                  <span className="shrink-0">{t("messageCount", { count: row.messages })}</span>
                </span>
              </span>
              <ChevronRight className="mt-3 h-4 w-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
