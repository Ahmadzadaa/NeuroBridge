"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowUp, Sparkles } from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { IconTile } from "@/components/ui/ios";
import { cn } from "@/lib/utils";

interface AiToolsPageClientProps {
  userName: string;
}

type Message = { role: "user" | "assistant"; content: string };

/** The AI Mentor: the one AI assistant students have, as a Messages-style chat. */
export function AiToolsPageClient({ userName }: AiToolsPageClientProps) {
  const t = useTranslations("participant.aiTools");
  const reduced = useReducedMotion();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "end" });
  }, [messages, loading, reduced]);

  async function handleSend(e?: React.FormEvent) {
    e?.preventDefault();
    const content = message.trim();
    if (!content || loading) return;
    setLoading(true);
    setMessages((prev) => [...prev, { role: "user", content }]);
    setMessage("");

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool: "ai_mentor", message: content }),
      });
      const data = await res.json().catch(() => null);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: res.ok && data?.response ? data.response : t("unavailable") },
      ]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: t("unavailable") }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <DashboardLayout panel="participant" title={t("title")} userName={userName}>
      <div className="mx-auto flex max-w-2xl flex-col">
        <div className="ios-reveal flex items-center gap-3.5">
          <IconTile icon={Sparkles} tone="fuchsia" size="lg" />
          <div>
            <h2 className="text-[24px] font-bold tracking-[-0.6px] text-foreground">{t("title")}</h2>
            <p className="text-[14px] text-muted-foreground">{t("subtitle")}</p>
          </div>
        </div>

        <div className="ios-reveal mt-6 flex min-h-[420px] flex-col overflow-hidden rounded-[24px] bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)] ring-1 ring-border/60 [--i:1]">
          <div className="flex-1 space-y-2 overflow-y-auto p-4 sm:p-5" aria-live="polite">
            {messages.length === 0 && (
              <p className="mx-auto max-w-sm py-16 text-center text-[14px] leading-relaxed text-muted-foreground">{t("empty")}</p>
            )}
            <AnimatePresence initial={false}>
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={reduced ? false : { opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
                  className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}
                >
                  <p
                    className={cn(
                      "max-w-[80%] whitespace-pre-wrap rounded-[20px] px-4 py-2.5 text-[15px] leading-relaxed",
                      msg.role === "user"
                        ? "rounded-br-md bg-primary text-primary-foreground"
                        : "rounded-bl-md bg-muted text-foreground"
                    )}
                  >
                    {msg.content}
                  </p>
                </motion.div>
              ))}
            </AnimatePresence>
            {loading && (
              <p className="flex items-center gap-1.5 px-1 text-[13px] text-muted-foreground">
                <span className="inline-flex gap-1" aria-hidden="true">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:120ms]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:240ms]" />
                </span>
                {t("thinking")}
              </p>
            )}
            <div ref={endRef} />
          </div>

          <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-border/60 bg-background/60 p-3 backdrop-blur-xl">
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t("chatPlaceholder")}
              aria-label={t("chatPlaceholder")}
              maxLength={4000}
              className="h-11 min-w-0 flex-1 rounded-full border border-border/70 bg-card px-4 text-[15px] text-foreground outline-none transition focus-visible:border-primary/40 focus-visible:ring-4 focus-visible:ring-primary/15"
            />
            <button
              type="submit"
              disabled={loading || !message.trim()}
              aria-label={t("send")}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition active:scale-90 disabled:opacity-40"
            >
              <ArrowUp className="h-5 w-5" strokeWidth={2.5} />
            </button>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
