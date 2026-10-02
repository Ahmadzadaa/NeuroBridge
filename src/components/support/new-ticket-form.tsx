"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2, Send } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function NewTicketForm() {
  const t = useTranslations("support");
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const ready = subject.trim().length >= 3 && body.trim().length > 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready || sending) return;
    setSending(true);
    try {
      const res = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: subject.trim(), body: body.trim() }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const { id } = (await res.json()) as { id: string };
      toast.success(t("created"));
      router.push(`/tenant/support/${id}`);
    } catch {
      toast.error(t("sendError"));
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
        <Textarea id="ticket-body" value={body} rows={7} maxLength={5000} placeholder={t("messagePlaceholder")} onChange={(e) => setBody(e.target.value)} />
        <p className="text-[12px] text-muted-foreground">{t("messageHint")}</p>
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
