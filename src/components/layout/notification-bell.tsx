"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Award,
  Bell,
  BellOff,
  Bot,
  CheckCheck,
  ClipboardCheck,
  GraduationCap,
  Headphones,
  Inbox,
  MessageCircle,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Item = { id: string; type: string; params: Record<string, string | number>; link: string | null; read: boolean; createdAt: string };

const LOOK: Record<string, { icon: LucideIcon; tone: string }> = {
  SUPPORT_TICKET_NEW: { icon: Headphones, tone: "from-indigo-500 to-blue-600" },
  SUPPORT_MESSAGE_NEW: { icon: MessageCircle, tone: "from-indigo-500 to-blue-600" },
  SUPPORT_REPLY: { icon: MessageCircle, tone: "from-violet-500 to-indigo-600" },
  LEAD_NEW: { icon: Inbox, tone: "from-sky-400 to-blue-600" },
  ASSESSMENTS_COMPLETED: { icon: ClipboardCheck, tone: "from-emerald-400 to-teal-600" },
  AI_BUDGET_EXHAUSTED: { icon: Bot, tone: "from-amber-400 to-orange-500" },
  CERTIFICATE_ISSUED: { icon: Award, tone: "from-amber-400 to-orange-500" },
  SIMULATION_GRADED: { icon: GraduationCap, tone: "from-fuchsia-500 to-purple-600" },
  HACKATHON_RESULTS: { icon: Trophy, tone: "from-orange-400 to-rose-500" },
};
const FALLBACK = { icon: Bell, tone: "from-slate-400 to-slate-600" };
const POLL_MS = 60_000;

/** "just now", "5 min ago"… from our own copy: browsers often lack relative-time data for Azerbaijani. */
function useRelativeTime() {
  const locale = useLocale();
  const t = useTranslations("notifications.time");
  return useCallback(
    (iso: string) => {
      const sec = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
      if (sec < 60) return t("now");
      if (sec < 3600) return t("minutes", { count: Math.floor(sec / 60) });
      if (sec < 86400) return t("hours", { count: Math.floor(sec / 3600) });
      if (sec < 7 * 86400) return t("days", { count: Math.floor(sec / 86400) });
      return new Date(iso).toLocaleDateString(locale === "en" ? "en-GB" : locale === "tr" ? "tr-TR" : "az-AZ", { day: "numeric", month: "short" });
    },
    [locale, t]
  );
}

/**
 * The bell in the top bar: a count of unread notifications and, on click, the
 * latest ones. Opening a notification marks it read and goes where it points.
 */
export function NotificationBell() {
  const t = useTranslations("notifications");
  const router = useRouter();
  const pathname = usePathname();
  const relative = useRelativeTime();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [unread, setUnread] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { items: Item[]; unread: number };
      setItems(data.items);
      setUnread(data.unread);
      setLoaded(true);
    } catch {
      // Offline for a moment: keep what is shown.
    }
  }, []);

  // Refreshed on every navigation, when the window regains focus and once a minute.
  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      try {
        const res = await fetch("/api/notifications", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { items: Item[]; unread: number };
        if (cancelled) return;
        setItems(data.items);
        setUnread(data.unread);
        setLoaded(true);
      } catch {
        // Offline for a moment: keep what is shown.
      }
    };
    void refresh();
    const timer = setInterval(refresh, POLL_MS);
    window.addEventListener("focus", refresh);
    return () => {
      cancelled = true;
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [pathname]);

  // Closes on a click outside or on Escape, like any menu.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function markRead(ids?: string[]) {
    setItems((list) => list.map((n) => (!ids || ids.includes(n.id) ? { ...n, read: true } : n)));
    setUnread((u) => (ids ? Math.max(0, u - ids.filter((id) => items.some((n) => n.id === id && !n.read)).length) : 0));
    await fetch("/api/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ids ? { ids } : {}),
    }).catch(() => undefined);
  }

  function openItem(item: Item) {
    if (!item.read) void markRead([item.id]);
    setOpen(false);
    if (item.link) router.push(item.link);
  }

  const text = (item: Item, part: "title" | "body") => {
    const key = `types.${item.type}.${part}`;
    return t.has(key) ? t(key, item.params) : part === "title" ? t("fallback") : "";
  };

  return (
    <div ref={rootRef} className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="relative rounded-xl"
        aria-label={unread > 0 ? t("bellUnread", { count: unread }) : t("bell")}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => {
          setOpen((o) => !o);
          if (!open) void load();
        }}
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute right-1 top-1 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold tabular-nums text-white ring-2 ring-background">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </Button>

      {open && (
        <div
          role="dialog"
          aria-label={t("title")}
          className="fixed inset-x-3 top-16 z-[60] flex max-h-[min(560px,calc(100vh-6rem))] flex-col overflow-hidden rounded-[22px] bg-card/95 shadow-[0_24px_60px_-20px_rgba(15,23,42,0.45)] ring-1 ring-border/70 backdrop-blur-2xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-[380px]"
        >
          <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3">
            <p className="text-[17px] font-bold tracking-[-0.3px]">{t("title")}</p>
            {unread > 0 && (
              <button
                type="button"
                onClick={() => markRead()}
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[13px] font-semibold text-primary transition-colors hover:bg-primary/10"
              >
                <CheckCheck className="h-4 w-4" aria-hidden="true" />
                {t("markAll")}
              </button>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {loaded && items.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <BellOff className="h-5 w-5" aria-hidden="true" />
                </span>
                <p className="text-[15px] font-semibold">{t("emptyTitle")}</p>
                <p className="text-[13px] text-muted-foreground">{t("emptyBody")}</p>
              </div>
            ) : (
              <ul className="divide-y divide-border/50">
                {items.map((item) => {
                  const look = LOOK[item.type] ?? FALLBACK;
                  const Icon = look.icon;
                  const body = text(item, "body");
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => openItem(item)}
                        className={cn(
                          "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50 active:bg-muted",
                          !item.read && "bg-primary/[0.04]"
                        )}
                      >
                        <span className={cn("mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-gradient-to-br text-white shadow-sm", look.tone)} aria-hidden="true">
                          <Icon className="h-[18px] w-[18px]" strokeWidth={2.2} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-baseline justify-between gap-2">
                            <span className={cn("min-w-0 text-[14px] leading-snug", item.read ? "font-medium text-foreground/85" : "font-semibold text-foreground")}>{text(item, "title")}</span>
                            <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">{relative(item.createdAt)}</span>
                          </span>
                          {body && <span className="mt-0.5 line-clamp-2 block text-[13px] leading-snug text-muted-foreground">{body}</span>}
                        </span>
                        {!item.read && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" aria-label={t("unread")} role="img" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
