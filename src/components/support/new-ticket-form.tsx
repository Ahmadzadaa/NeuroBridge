"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2, Paperclip, Send } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ACCEPT_ATTRIBUTE, MAX_ATTACHMENTS } from "@/lib/support/attachment-types";
import { cn } from "@/lib/utils";
import { DraftChips, filesFromClipboard, useAttachmentDraft } from "./attachments";

export function NewTicketForm() {
  const t = useTranslations("support");
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const draft = useAttachmentDraft();
  const ready = subject.trim().length >= 3 && body.trim().length > 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready || sending) return;
    setSending(true);
    try {
      const form = new FormData();
      form.set("subject", subject.trim());
      form.set("body", body.trim());
      // Sent along so the platform team can reproduce a problem without asking.
      form.set(
        "context",
        JSON.stringify({
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          language: navigator.language,
          screen: `${window.screen.width}×${window.screen.height}`,
          viewport: `${window.innerWidth}×${window.innerHeight}`,
        })
      );
      for (const file of draft.files) form.append("files", file);
      const res = await fetch("/api/support/tickets", { method: "POST", body: form });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { code?: string } | null;
        throw new Error(data?.code ?? String(res.status));
      }
      const { id } = (await res.json()) as { id: string };
      toast.success(t("created"));
      router.push(`/tenant/support/${id}`);
    } catch (error) {
      const code = error instanceof Error ? error.message : "";
      toast.error(["FILE_TYPE_NOT_ALLOWED", "FILE_TOO_LARGE", "TOO_MANY_FILES"].includes(code) ? t(`attachments.${code}`) : t("sendError"));
      setSending(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-[22px] bg-card p-5 ring-1 ring-border/60">
      <div className="space-y-1.5">
        <Label htmlFor="ticket-subject">{t("subject")}</Label>
        <Input id="ticket-subject" value={subject} maxLength={150} placeholder={t("subjectPlaceholder")} onChange={(e) => setSubject(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ticket-body">{t("message")}</Label>
        <Textarea
          id="ticket-body"
          value={body}
          rows={7}
          maxLength={5000}
          placeholder={t("messagePlaceholder")}
          onChange={(e) => setBody(e.target.value)}
          onPaste={(e) => {
            if (e.clipboardData.files.length === 0) return;
            e.preventDefault();
            draft.add(filesFromClipboard(e));
          }}
        />
        <p className="text-[12px] text-muted-foreground">{t("messageHint")}</p>
      </div>

      {/* Screenshots and files: drop them here, pick them, or paste into the message. */}
      <div
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
          "rounded-[18px] border border-dashed border-border px-4 py-4 transition-colors",
          dragging ? "border-primary bg-primary/5" : "bg-muted/30"
        )}
      >
        <DraftChips files={draft.files} onRemove={draft.remove} />
        <div className="flex flex-wrap items-center gap-3">
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
          <Button type="button" variant="outline" size="sm" className="rounded-full" disabled={draft.files.length >= MAX_ATTACHMENTS} onClick={() => fileRef.current?.click()}>
            <Paperclip className="h-4 w-4" aria-hidden="true" />
            {t("attachments.add")}
          </Button>
          <span className="text-[12px] text-muted-foreground">{t("attachments.hint", { max: MAX_ATTACHMENTS })}</span>
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={!ready || sending}>
          {sending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
          {t("submit")}
        </Button>
      </div>
    </form>
  );
}
