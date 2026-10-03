"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowUp, Ban, CheckCircle2, Languages, Loader2, Paperclip, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { UserAvatar } from "@/components/ui/user-avatar";
import type { SupportStatus } from "@/lib/support/support-service";
import { ACCEPT_ATTRIBUTE } from "@/lib/support/attachment-types";
import { DraftChips, filesFromClipboard, MessageAttachments, useAttachmentDraft, type SentAttachment } from "./attachments";
import { cn } from "@/lib/utils";

/** Day and time are formatted on the server, so both renders agree on the time zone. */
export type ThreadMessage = {
  id: string;
  body: string;
  fromStaff: boolean;
  author: string;
  authorId: string;
  day: string;
  time: string;
  attachments: SentAttachment[];
  edited: boolean;
  deleted: boolean;
};

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
  viewerId,
  canWrite,
  status,
  messages,
}: {
  ticketId: string;
  apiBase: string;
  viewer: "staff" | "tenant";
  /** Who is reading: only their own messages can be edited or removed. */
  viewerId: string;
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
  const fileRef = useRef<HTMLInputElement>(null);
  const draft = useAttachmentDraft();
  const [dragging, setDragging] = useState(false);
  const locale = useLocale();
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function saveEdit() {
    if (!editing || busyId) return;
    setBusyId(editing.id);
    try {
      const res = await fetch(`/api/support/messages/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: editing.text.trim() }),
      });
      if (!res.ok) throw new Error(String(res.status));
      // A translation of the old wording would now be wrong.
      setTranslated((s) => ({ ...s, [editing.id]: "" }));
      setShowing((s) => ({ ...s, [editing.id]: false }));
      setEditing(null);
      router.refresh();
    } catch {
      toast.error(t("editError"));
    } finally {
      setBusyId(null);
    }
  }

  async function removeMessage(id: string) {
    if (!window.confirm(t("deleteConfirm"))) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/support/messages/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(String(res.status));
      toast.success(t("deleted"));
      router.refresh();
    } catch {
      toast.error(t("editError"));
    } finally {
      setBusyId(null);
    }
  }
  // Translations asked for in this visit: id -> text, and which are on screen.
  const [translated, setTranslated] = useState<Record<string, string>>({});
  const [showing, setShowing] = useState<Record<string, boolean>>({});
  const [translating, setTranslating] = useState<string | null>(null);

  async function toggleTranslation(id: string) {
    if (translated[id]) return setShowing((s) => ({ ...s, [id]: !s[id] }));
    setTranslating(id);
    try {
      const res = await fetch(`/api/support/messages/${id}/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const { text } = (await res.json()) as { text: string };
      setTranslated((s) => ({ ...s, [id]: text }));
      setShowing((s) => ({ ...s, [id]: true }));
    } catch {
      toast.error(t("translateError"));
    } finally {
      setTranslating(null);
    }
  }

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
    if ((!body.trim() && draft.files.length === 0) || sending) return;
    setSending(true);
    try {
      const form = new FormData();
      form.set("body", body.trim());
      for (const file of draft.files) form.append("files", file);
      const res = await fetch(`${apiBase}/${ticketId}/messages`, { method: "POST", body: form });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { code?: string } | null;
        throw new Error(data?.code ?? String(res.status));
      }
      setBody("");
      draft.clear();
      sentRef.current = true;
      router.refresh();
    } catch (error) {
      const code = error instanceof Error ? error.message : "";
      // The server's verdict on a file is more precise than a generic failure.
      toast.error(["FILE_TYPE_NOT_ALLOWED", "FILE_TOO_LARGE", "TOO_MANY_FILES"].includes(code) ? t(`attachments.${code}`) : t("sendError"));
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

  const resolved = status === "RESOLVED";

  return (
    <div className="space-y-3">
      {/* The conversation sits on a soft surface, not in a box, like a messages app. */}
      <div className="rounded-[26px] bg-muted/40 px-3 py-4 dark:bg-white/[0.025] sm:px-5">
        <ol className="space-y-1" aria-label={t("conversation")}>
          {messages.map((m, i) => {
            const prev = messages[i - 1];
            const next = messages[i + 1];
            const mine = (viewer === "staff") === m.fromStaff;
            const newDay = !prev || prev.day !== m.day;
            const firstOfGroup = newDay || prev.authorId !== m.authorId;
            const lastOfGroup = !next || next.authorId !== m.authorId || next.day !== m.day;
            return (
              <li key={m.id}>
                {newDay && <p className="pb-3 pt-2 text-center text-[12px] font-medium text-muted-foreground">{m.day}</p>}
                <div className={cn("flex items-end gap-2", mine ? "justify-end" : "justify-start", firstOfGroup && !newDay && "pt-3")}>
                  {!mine && (
                    <span className="w-8 shrink-0">
                      {lastOfGroup && <UserAvatar userId={m.authorId} name={m.author} hasAvatar={false} className="h-8 w-8 text-[12px]" />}
                    </span>
                  )}
                  <div className={cn("flex max-w-[82%] flex-col sm:max-w-[70%]", mine ? "items-end" : "items-start")}>
                    {firstOfGroup && !mine && (
                      <span className="mb-1 px-3 text-[12px] font-medium text-muted-foreground">
                        {m.fromStaff ? t("teamName", { name: m.author }) : m.author}
                      </span>
                    )}
                    {m.deleted ? (
                      <div className="inline-flex items-center gap-1.5 rounded-[20px] px-4 py-2 text-[14px] italic text-muted-foreground border border-dashed border-border">
                        <Ban className="h-3.5 w-3.5" aria-hidden="true" />
                        {t("deletedMessage")}
                      </div>
                    ) : editing?.id === m.id ? (
                      <div className="w-[min(520px,80vw)] rounded-[20px] bg-card p-2 ring-2 ring-primary/40">
                        <label htmlFor={`edit-${m.id}`} className="sr-only">
                          {t("editLabel")}
                        </label>
                        <textarea
                          id={`edit-${m.id}`}
                          autoFocus
                          value={editing.text}
                          maxLength={5000}
                          rows={Math.min(8, Math.max(2, editing.text.split("\n").length))}
                          onChange={(e) => setEditing({ id: m.id, text: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === "Escape") setEditing(null);
                            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                              e.preventDefault();
                              void saveEdit();
                            }
                          }}
                          className="w-full resize-none bg-transparent px-2 py-1.5 text-[15px] leading-relaxed outline-none"
                        />
                        <div className="flex justify-end gap-2 px-1 pb-0.5">
                          <button
                            type="button"
                            onClick={() => setEditing(null)}
                            className="rounded-full px-3 py-1 text-[13px] font-semibold text-muted-foreground transition-colors hover:bg-muted"
                          >
                            {t("cancel")}
                          </button>
                          <button
                            type="button"
                            onClick={() => void saveEdit()}
                            disabled={busyId === m.id || (!editing.text.trim() && m.attachments.length === 0)}
                            className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-[13px] font-semibold text-primary-foreground transition-opacity disabled:opacity-40"
                          >
                            {busyId === m.id && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
                            {t("save")}
                          </button>
                        </div>
                      </div>
                    ) : (
                      m.body && (
                        <div
                          className={cn(
                            "whitespace-pre-wrap break-words rounded-[20px] px-4 py-2.5 text-[15px] leading-relaxed",
                            mine
                              ? "bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-[0_6px_16px_-10px_rgba(91,91,214,0.9)]"
                              : "bg-card text-foreground shadow-[0_1px_2px_rgba(15,23,42,0.06)] ring-1 ring-border/60",
                            lastOfGroup && (mine ? "rounded-br-[6px]" : "rounded-bl-[6px]"),
                          )}
                        >
                          {showing[m.id] ? translated[m.id] : m.body}
                        </div>
                      )
                    )}
                    {!m.deleted && m.attachments.length > 0 && (
                      <div className={cn(m.body && "mt-1.5")}>
                        <MessageAttachments items={m.attachments} mine={mine} />
                      </div>
                    )}
                    {(lastOfGroup || !mine || m.authorId === viewerId) && (
                      <span className="group/meta mt-1 flex items-center gap-2 px-2 text-[11px] text-muted-foreground">
                        {lastOfGroup && <span className="tabular-nums">{m.time}</span>}
                        {m.edited && !m.deleted && <span className="italic">{t("edited")}</span>}
                        {/* Your own words, while they are still there, can be changed or taken back. */}
                        {canWrite && m.authorId === viewerId && !m.deleted && editing?.id !== m.id && (
                          <span className="flex items-center gap-2 opacity-70 transition-opacity hover:opacity-100 focus-within:opacity-100">
                            <button
                              type="button"
                              onClick={() => setEditing({ id: m.id, text: m.body })}
                              className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                            >
                              <Pencil className="h-3 w-3" aria-hidden="true" />
                              {t("edit")}
                            </button>
                            <button
                              type="button"
                              onClick={() => void removeMessage(m.id)}
                              disabled={busyId === m.id}
                              className="inline-flex items-center gap-1 font-medium text-destructive hover:underline disabled:opacity-50"
                            >
                              {busyId === m.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                              ) : (
                                <Trash2 className="h-3 w-3" aria-hidden="true" />
                              )}
                              {t("delete")}
                            </button>
                          </span>
                        )}
                        {/* Only the other side's words need translating; yours are already in your language. */}
                        {!mine && m.body && !m.deleted && (
                          <button
                            type="button"
                            onClick={() => toggleTranslation(m.id)}
                            disabled={translating === m.id}
                            className="inline-flex items-center gap-1 rounded-full font-medium text-primary transition-opacity hover:opacity-80 disabled:opacity-60"
                          >
                            {translating === m.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                            ) : (
                              <Languages className="h-3 w-3" aria-hidden="true" />
                            )}
                            {translating === m.id ? t("translating") : showing[m.id] ? t("showOriginal") : t("translate")}
                          </button>
                        )}
                        {showing[m.id] && <span className="italic">{t("translatedNote")}</span>}
                      </span>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
        <div ref={endRef} />
      </div>

      {canWrite && resolved && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] bg-emerald-500/10 px-4 py-3 ring-1 ring-emerald-500/20">
          <span className="flex items-center gap-2 text-[14px] text-foreground">
            <CheckCircle2 className="h-[18px] w-[18px] shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            {t("resolvedBanner")}
          </span>
          <button
            type="button"
            disabled={changing}
            onClick={() => changeStatus("OPEN")}
            className="inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-[13px] font-semibold text-primary shadow-sm ring-1 ring-border/60 transition-colors hover:bg-muted disabled:opacity-50"
          >
            {changing ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <RotateCcw className="h-4 w-4" aria-hidden="true" />}
            {t("reopen")}
          </button>
        </div>
      )}

      {canWrite && (
        // Stays in reach at the bottom of the screen while scrolling a long thread.
        <div className="sticky bottom-3 z-10 lg:bottom-5">
          <form
            onSubmit={send}
            onDragOver={(e) => {
              if (!e.dataTransfer.types.includes("Files")) return;
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              if (!e.dataTransfer.files.length) return;
              e.preventDefault();
              setDragging(false);
              draft.add(e.dataTransfer.files);
            }}
            className={cn(
              "rounded-[24px] bg-card/90 p-1.5 shadow-[0_12px_32px_-16px_rgba(15,23,42,0.45)] ring-1 ring-border/70 backdrop-blur-xl transition-shadow focus-within:ring-2 focus-within:ring-primary/40",
              dragging && "ring-2 ring-primary/60",
            )}
          >
            <DraftChips files={draft.files} onRemove={draft.remove} />
            <div className="flex items-end gap-1.5">
              <input
                ref={fileRef}
                type="file"
                multiple
                accept={ACCEPT_ATTRIBUTE}
                className="sr-only"
                tabIndex={-1}
                onChange={(e) => {
                  draft.add(e.target.files);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                aria-label={t("attachments.add")}
                title={t("attachments.add")}
                className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Paperclip className="h-[18px] w-[18px]" aria-hidden="true" />
              </button>
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
                onPaste={(e) => {
                  // A pasted screenshot becomes an attachment instead of being lost.
                  if (e.clipboardData.files.length === 0) return;
                  e.preventDefault();
                  draft.add(filesFromClipboard(e));
                }}
                placeholder={resolved ? t("replyReopens") : t("replyPlaceholder")}
                onKeyDown={(e) => {
                  // Enter sends, as in any messages app; Shift+Enter starts a new line.
                  // Not while an input method is composing a character.
                  if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    void send();
                  }
                }}
                className="max-h-[220px] min-h-[40px] flex-1 resize-none bg-transparent px-1 py-2.5 text-[15px] leading-relaxed outline-none placeholder:text-muted-foreground/70"
              />
              <button
                type="submit"
                disabled={sending || (!body.trim() && draft.files.length === 0)}
                aria-label={t("send")}
                className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-sm transition-[opacity,transform] active:scale-95 disabled:opacity-30"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <ArrowUp className="h-[18px] w-[18px]" strokeWidth={2.5} aria-hidden="true" />
                )}
              </button>
            </div>
          </form>
          <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 px-3">
            <span className="hidden text-[12px] text-muted-foreground sm:inline">{t("shortcut")}</span>
            {!resolved && (
              <button
                type="button"
                disabled={changing}
                onClick={() => changeStatus("RESOLVED")}
                className="ml-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-semibold text-emerald-700 transition-colors hover:bg-emerald-500/10 disabled:opacity-50 dark:text-emerald-400"
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
