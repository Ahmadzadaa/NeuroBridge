"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Bot, ImagePlus, Loader2, Mic, Send, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The AI Mentor chat for one simulation. Model output is rendered as plain
 * text only: React escapes it, nothing is parsed as Markdown or HTML, and no
 * link or image from a reply is ever loaded.
 */

interface Turn {
  id: string;
  role: "user" | "assistant";
  content: string;
  hasImage?: boolean;
  status?: string;
}

interface PanelState {
  enabled: boolean;
  transcript: Turn[];
  remaining: number;
  dailyLimit: number;
  maxChars: number;
  imagesAllowed: boolean;
  imagesRemaining: number;
}

/** Microphone and avatar are planned; their slots exist but stay hidden until the flag is on. */
const VOICE_ENABLED = process.env.NEXT_PUBLIC_AI_VOICE_ENABLED === "true";
const IMAGE_TYPES = "image/jpeg,image/png,image/webp";

type SseEvent = { event: string; data: Record<string, unknown> };

/** Splits a text/event-stream buffer into complete events plus the unfinished rest. */
function parseSse(buffer: string): { events: SseEvent[]; rest: string } {
  const parts = buffer.split("\n\n");
  const rest = parts.pop() ?? "";
  const events: SseEvent[] = [];
  for (const part of parts) {
    let event = "message";
    let data = "";
    for (const line of part.split("\n")) {
      if (line.startsWith("event: ")) event = line.slice(7);
      else if (line.startsWith("data: ")) data += line.slice(6);
    }
    try {
      events.push({ event, data: data ? (JSON.parse(data) as Record<string, unknown>) : {} });
    } catch {
      // A malformed frame is skipped rather than shown.
    }
  }
  return { events, rest };
}

export function MentorPanel({ simulationId }: { simulationId: string }) {
  const t = useTranslations("mentor");
  const locale = useLocale();
  const [state, setState] = useState<PanelState | null>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const errorText = useCallback(
    (code: unknown) => {
      const key = typeof code === "string" ? `errors.${code}` : "";
      return key && t.has(key) ? t(key) : t("errors.generic");
    },
    [t]
  );

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/mentor/chat?simulation_id=${encodeURIComponent(simulationId)}`)
      .then((res) => (res.ok ? (res.json() as Promise<PanelState>) : null))
      .then((data) => {
        if (!cancelled && data?.enabled) setState(data);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [simulationId]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [state?.transcript, waiting, open]);

  // A local object URL of the participant's own file, released when it changes.
  const preview = useMemo(() => (image ? URL.createObjectURL(image) : null), [image]);
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  if (!state) return null;

  const limitReached = state.remaining <= 0;
  const tooLong = draft.length > state.maxChars;
  const canSend = !busy && !limitReached && draft.trim().length > 0 && !tooLong;

  const update = (fn: (s: PanelState) => PanelState) => setState((s) => (s ? fn(s) : s));
  const appendToReply = (id: string, text: string, replace = false) =>
    update((s) => ({
      ...s,
      transcript: s.transcript.map((m) => (m.id === id ? { ...m, content: replace ? text : m.content + text } : m)),
    }));

  async function send() {
    if (!canSend || !state) return;
    const message = draft.trim();
    const replyId = `reply-${Date.now()}`;
    setBusy(true);
    setWaiting(true);
    setNotice(null);
    update((s) => ({
      ...s,
      transcript: [
        ...s.transcript,
        { id: `me-${Date.now()}`, role: "user", content: message, hasImage: Boolean(image) },
        { id: replyId, role: "assistant", content: "" },
      ],
    }));
    setDraft("");

    const body = new FormData();
    body.set("simulation_id", simulationId);
    body.set("message", message);
    body.set("locale", locale);
    if (image) body.set("image", image);
    const sentImage = Boolean(image);
    setImage(null);

    try {
      const res = await fetch("/api/mentor/chat", { method: "POST", body });
      if (!res.ok || !res.body) {
        const data = (await res.json().catch(() => null)) as { code?: string } | null;
        update((s) => ({ ...s, transcript: s.transcript.filter((m) => m.id !== replyId) }));
        setNotice(errorText(data?.code));
        if (data?.code === "AI_LIMIT_DAILY_MESSAGES") update((s) => ({ ...s, remaining: 0 }));
        return;
      }
      if (sentImage) update((s) => ({ ...s, imagesRemaining: Math.max(0, s.imagesRemaining - 1) }));

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        const parsed = parseSse(buffer + decoder.decode(value, { stream: true }));
        buffer = parsed.rest;
        parsed.events.forEach(({ event, data }) => {
          if (event === "meta" && typeof data.remaining === "number") {
            const remaining = data.remaining;
            update((s) => ({ ...s, remaining }));
          } else if (event === "delta" && typeof data.text === "string") {
            setWaiting(false);
            appendToReply(replyId, data.text);
          } else if (event === "replace" && typeof data.text === "string") {
            setWaiting(false);
            appendToReply(replyId, data.text, true);
          } else if (event === "error") {
            setNotice(errorText(data.code));
          }
        });
      }
    } catch {
      setNotice(t("errors.generic"));
    } finally {
      setBusy(false);
      setWaiting(false);
      update((s) => ({ ...s, transcript: s.transcript.filter((m) => m.role === "user" || m.content) }));
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("open")}
        className={cn(
          "fixed bottom-24 right-4 z-40 inline-flex h-12 items-center gap-2 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 px-4 text-[14px] font-semibold text-white shadow-lg shadow-indigo-500/30 transition-transform active:scale-95 lg:bottom-6 lg:right-6",
          open && "hidden"
        )}
      >
        <Sparkles className="h-4 w-4" aria-hidden="true" />
        {t("title")}
      </button>

      {open && (
        <section
          role="dialog"
          aria-label={t("title")}
          className="fixed inset-x-0 bottom-0 z-[60] flex h-[85dvh] flex-col rounded-t-[22px] bg-card shadow-2xl ring-1 ring-border/60 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:h-[600px] sm:max-h-[calc(100dvh-3rem)] sm:w-[400px] sm:rounded-[22px]"
        >
          <header className="flex items-start gap-3 border-b border-border/60 p-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white">
              <Bot className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 text-[15px] font-bold">
                {t("title")}
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">AI</span>
              </p>
              <p className="text-[12px] text-muted-foreground">{t("aiNotice")}</p>
            </div>
            {/* Reserved for the avatar (voice phase). */}
            <div data-slot="mentor-avatar" hidden={!VOICE_ENABLED} className="h-9 w-9" />
            <button type="button" onClick={() => setOpen(false)} aria-label={t("close")} className="rounded-full p-1.5 text-muted-foreground hover:bg-muted">
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </header>

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
            {state.transcript.length === 0 && <p className="py-6 text-center text-[13px] text-muted-foreground">{t("empty")}</p>}
            {state.transcript.map((m) => (
              <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                <p
                  className={cn(
                    "max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-[14px] leading-relaxed",
                    m.role === "user" ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md bg-muted text-foreground"
                  )}
                >
                  {m.content}
                  {m.hasImage && <span className="mt-1 block text-[11px] opacity-80">{t("imageAttached")}</span>}
                </p>
              </div>
            ))}
            {waiting && (
              <div className="flex justify-start" aria-label={t("typing")}>
                <span className="inline-flex gap-1 rounded-2xl rounded-bl-md bg-muted px-3.5 py-3">
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60" style={{ animationDelay: `${i * 150}ms` }} />
                  ))}
                </span>
              </div>
            )}
          </div>

          <footer className="space-y-2 border-t border-border/60 p-3">
            {notice && <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-[12px] text-destructive">{notice}</p>}
            {limitReached ? (
              <p className="rounded-xl bg-muted px-3 py-2 text-center text-[13px] text-muted-foreground">{t("limitReached")}</p>
            ) : (
              <>
                {preview && (
                  <div className="flex items-center gap-2">
                    {/* A local object URL of the participant's own file; nothing remote is loaded. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={preview} alt="" className="h-12 w-12 rounded-lg object-cover" />
                    <button type="button" onClick={() => setImage(null)} className="text-[12px] text-muted-foreground underline">
                      {t("removeImage")}
                    </button>
                  </div>
                )}
                <div className="flex items-end gap-2">
                  {state.imagesAllowed && state.imagesRemaining > 0 && (
                    <>
                      <input
                        ref={fileRef}
                        type="file"
                        accept={IMAGE_TYPES}
                        hidden
                        onChange={(e) => {
                          const file = e.target.files?.[0] ?? null;
                          e.target.value = "";
                          if (file && !IMAGE_TYPES.split(",").includes(file.type)) {
                            setNotice(t("errors.AI_IMAGE_INVALID"));
                            return;
                          }
                          setImage(file);
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        aria-label={t("attachImage", { count: state.imagesRemaining })}
                        title={t("attachImage", { count: state.imagesRemaining })}
                        className="rounded-xl p-2.5 text-muted-foreground hover:bg-muted"
                      >
                        <ImagePlus className="h-5 w-5" aria-hidden="true" />
                      </button>
                    </>
                  )}
                  {/* Reserved for the microphone (voice phase). */}
                  <button type="button" hidden={!VOICE_ENABLED} disabled aria-label={t("mic")} className="rounded-xl p-2.5 text-muted-foreground">
                    <Mic className="h-5 w-5" aria-hidden="true" />
                  </button>
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void send();
                      }
                    }}
                    rows={2}
                    maxLength={state.maxChars + 50}
                    placeholder={t("placeholder")}
                    aria-label={t("placeholder")}
                    className="min-h-[44px] flex-1 resize-none rounded-xl bg-muted/60 px-3 py-2 text-[14px] outline-none ring-1 ring-border/60 focus:ring-2 focus:ring-primary/40"
                  />
                  <button
                    type="button"
                    onClick={() => void send()}
                    disabled={!canSend}
                    aria-label={t("send")}
                    className="rounded-xl bg-primary p-2.5 text-primary-foreground transition-opacity disabled:opacity-40"
                  >
                    {busy ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <Send className="h-5 w-5" aria-hidden="true" />}
                  </button>
                </div>
              </>
            )}
            <p className="flex justify-between text-[11px] text-muted-foreground">
              <span>{t("remaining", { count: state.remaining, total: state.dailyLimit })}</span>
              <span className={cn(tooLong && "font-semibold text-destructive")}>
                {draft.length}/{state.maxChars}
              </span>
            </p>
          </footer>
        </section>
      )}
    </>
  );
}
