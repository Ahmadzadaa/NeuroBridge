"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowUp, CheckCircle2, Loader2, RotateCcw } from "lucide-react";
import { UserAvatar } from "@/components/ui/user-avatar";
import type { SupportStatus } from "@/lib/support/support-service";
import { cn } from "@/lib/utils";

/** Day and time are formatted on the server, so both renders agree on the time zone. */
export type ThreadMessage = { id: string; body: string; fromStaff: boolean; author: string; authorId: string; day: string; time: string };

/**
 * One support conversation, laid out like a messages app: the viewer's side
 * on the right, consecutive messages from one person grouped, a divider per
 * day. The platform team's messages carry its name so an organisation always
 * knows who answered.
 */
export function SupportThread({
  ticketId,
  apiBase,
  viewer,
  canWrite,
  status,
  messages,
}: {
  ticketId: string;
  apiBase: string;
  viewer: "staff" | "tenant";
  canWrite: boolean;
  status: SupportStatus;
  messages: ThreadMessage[];
}) {
  const t = useTranslations("support");
  const router = useRouter();
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [changing, setChanging] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const sentRef = useRef(false);

  // Follow the conversation after sending, not on first load (that would yank the page).
  useEffect(() => {
    if (sentRef.current) endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
    sentRef.current = false;
  }, [messages.length]);

  // The field grows with what is typed, up to a limit, like a messages app.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
  }, [body]);

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    if (!body.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch(`${apiBase}/${ticketId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: body.trim() }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setBody("");
      sentRef.current = true;
      router.refresh();
    } catch {
      toast.error(t("sendError"));
    } finally {
      setSending(false);
    }
  }

  async function changeStatus(next: "OPEN" | "RESOLVED") {
    setChanging(true);
    try {
      const res = await fetch(`${apiBase}/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) throw new Error(String(res.status));
      toast.success(next === "RESOLVED" ? t("resolvedToast") : t("reopenedToast"));
      router.refresh();
    } catch {
      toast.error(t("sendError"));
    } finally {
      setChanging(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-[24px] bg-card ring-1 ring-border/60 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)]">
      <ol className="space-y-1 px-3 py-5 sm:px-5" aria-label={t("conversation")}>
        {messages.map((m, i) => {
          const prev = messages[i - 1];
          const next = messages[i + 1];
          const mine = (viewer === "staff") === m.fromStaff;
          const newDay = !prev || prev.day !== m.day;
          const firstOfGroup = newDay || prev.authorId !== m.authorId;
          const lastOfGroup = !next || next.authorId !== m.authorId || next.day !== m.day;
          return (
            <li key={m.id}>
              {newDay && (
                <p className="py-3 text-center text-[12px] font-semibold text-muted-foreground">
                  <span className="rounded-full bg-muted px-3 py-1">{m.day}</span>
                </p>
              )}
              <div className={cn("flex items-end gap-2", mine ? "justify-end" : "justify-start", firstOfGroup && !newDay && "pt-2")}>
                {!mine && (
                  <span className="w-8 shrink-0">
                    {lastOfGroup && <UserAvatar userId={m.authorId} name={m.author} hasAvatar={false} className="h-8 w-8 text-[12px]" />}
                  </span>
                )}
                <div className={cn("flex max-w-[82%] flex-col sm:max-w-[72%]", mine ? "items-end" : "items-start")}>
                  {firstOfGroup && !mine && (
                    <span className="mb-1 px-3 text-[12px] font-semibold text-muted-foreground">
                      {m.fromStaff ? t("teamName", { name: m.author }) : m.author}
                    </span>
                  )}
                  <div
                    className={cn(
                      "whitespace-pre-wrap break-words rounded-[20px] px-3.5 py-2 text-[15px] leading-relaxed",
                      mine ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
                      lastOfGroup && (mine ? "rounded-br-[6px]" : "rounded-bl-[6px]")
                    )}
                  >
                    {m.body}
                  </div>
                  {lastOfGroup && <span className="mt-1 px-2 text-[11px] tabular-nums text-muted-foreground">{m.time}</span>}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
      <div ref={endRef} />

      {canWrite && (
        <div className="border-t border-border/60 bg-background/40 px-3 pb-3 pt-3 sm:px-5">
          <form onSubmit={send} className="flex items-end gap-2 rounded-[22px] bg-card py-1.5 pl-4 pr-1.5 ring-1 ring-border transition-shadow focus-within:ring-2 focus-within:ring-primary/40">
            <label htmlFor="support-reply" className="sr-only">
              {t("replyLabel")}
            </label>
            <textarea
              ref={inputRef}
              id="support-reply"
              value={body}
              rows={1}
              maxLength={5000}
              onChange={(e) => setBody(e.target.value)}
              placeholder={status === "RESOLVED" ? t("replyReopens") : t("replyPlaceholder")}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) send(e);
              }}
              className="max-h-[220px] min-h-[36px] flex-1 resize-none bg-transparent py-2 text-[15px] leading-relaxed outline-none placeholder:text-muted-foreground/70"
            />
            <button
              type="submit"
              disabled={sending || !body.trim()}
              aria-label={t("send")}
              className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-[opacity,transform] active:scale-95 disabled:opacity-30"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ArrowUp className="h-[18px] w-[18px]" strokeWidth={2.5} aria-hidden="true" />}
            </button>
          </form>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 px-1">
            <span className="hidden text-[12px] text-muted-foreground sm:inline">{t("shortcut")}</span>
            {status === "RESOLVED" ? (
              <button
                type="button"
                disabled={changing}
                onClick={() => changeStatus("OPEN")}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold text-primary transition-colors hover:bg-primary/10 disabled:opacity-50"
              >
                {changing ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <RotateCcw className="h-4 w-4" aria-hidden="true" />}
                {t("reopen")}
              </button>
            ) : (
              <button
                type="button"
                disabled={changing}
                onClick={() => changeStatus("RESOLVED")}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold text-emerald-700 transition-colors hover:bg-emerald-500/10 disabled:opacity-50 dark:text-emerald-400"
              >
                {changing ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
                {t("markResolved")}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
