"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, Loader2, RotateCcw, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { SupportStatus } from "@/lib/support/support-service";
import { cn } from "@/lib/utils";

/** `when` is formatted on the server, so both renders agree on the time zone. */
export type ThreadMessage = { id: string; body: string; fromStaff: boolean; author: string; when: string };

/**
 * One support conversation. The viewer's own side sits on the right; the
 * platform team's messages carry its name so an organisation always knows
 * who answered.
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

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
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
    <div className="space-y-4">
      <ol className="space-y-3" aria-label={t("conversation")}>
        {messages.map((m) => {
          const mine = (viewer === "staff") === m.fromStaff;
          return (
            <li key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[85%] rounded-[20px] px-4 py-3 sm:max-w-[75%]",
                  mine ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md bg-card text-foreground ring-1 ring-border/60"
                )}
              >
                <p className={cn("mb-1 text-[12px] font-semibold", mine ? "text-primary-foreground/80" : "text-muted-foreground")}>
                  {m.fromStaff ? t("teamName", { name: m.author }) : m.author}
                  <span className="font-normal"> · {m.when}</span>
                </p>
                <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">{m.body}</p>
              </div>
            </li>
          );
        })}
      </ol>
      <div ref={endRef} />

      {canWrite && (
        <form onSubmit={send} className="space-y-3 rounded-[22px] bg-card p-4 ring-1 ring-border/60">
          <label htmlFor="support-reply" className="sr-only">
            {t("replyLabel")}
          </label>
          <Textarea
            id="support-reply"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={status === "RESOLVED" ? t("replyReopens") : t("replyPlaceholder")}
            rows={4}
            maxLength={5000}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) send(e);
            }}
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            {status === "RESOLVED" ? (
              <Button type="button" variant="outline" disabled={changing} onClick={() => changeStatus("OPEN")}>
                {changing ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <RotateCcw className="h-4 w-4" aria-hidden="true" />}
                {t("reopen")}
              </Button>
            ) : (
              <Button type="button" variant="outline" disabled={changing} onClick={() => changeStatus("RESOLVED")}>
                {changing ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
                {t("markResolved")}
              </Button>
            )}
            <Button type="submit" disabled={sending || !body.trim()}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
              {t("send")}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
