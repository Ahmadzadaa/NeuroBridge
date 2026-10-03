"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Check, Copy, KeyRound, Loader2, Mail, MailWarning } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useApiErrorMessage } from "@/lib/api/api-error";

type Issued = { url: string; email: string; emailed: boolean; expiresAt: string };

/**
 * For an organisation whose admin has not activated yet: makes a fresh
 * set-password link, emails it where mail works, and shows it to copy and
 * pass on by hand where it does not.
 */
export function ActivationLinkButton({ tenantId, tenantName }: { tenantId: string; tenantName: string }) {
  const t = useTranslations("superAdmin.tenants.activation");
  const apiError = useApiErrorMessage();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [issued, setIssued] = useState<Issued | null>(null);
  const [copied, setCopied] = useState(false);

  async function issue() {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}/activation-link`, { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.code === "ALREADY_ACTIVE" ? t("alreadyActive") : apiError(data));
        return;
      }
      setIssued(data as Issued);
      setCopied(false);
      setOpen(true);
    } catch {
      toast.error(t("failed"));
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!issued) return;
    try {
      await navigator.clipboard.writeText(issued.url);
      setCopied(true);
      toast.success(t("copied"));
    } catch {
      toast.error(t("failed"));
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" className="rounded-lg" onClick={issue} disabled={busy}>
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />}
        {t("button")}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription>{t("description", { name: tenantName })}</DialogDescription>
          </DialogHeader>
          {issued && (
            <div className="space-y-4 py-1">
              <p
                className={
                  issued.emailed
                    ? "flex items-start gap-2 rounded-xl bg-emerald-500/10 p-3 text-[13px] font-medium text-emerald-700 dark:text-emerald-400"
                    : "flex items-start gap-2 rounded-xl bg-amber-500/10 p-3 text-[13px] font-medium text-amber-700 dark:text-amber-400"
                }
              >
                {issued.emailed ? <Mail className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> : <MailWarning className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />}
                {issued.emailed ? t("emailed", { email: issued.email }) : t("notEmailed", { email: issued.email })}
              </p>
              <div className="flex items-center gap-2 rounded-xl bg-muted/60 p-2">
                <input readOnly value={issued.url} aria-label={t("linkLabel")} onFocus={(e) => e.currentTarget.select()} className="h-9 min-w-0 flex-1 bg-transparent px-1 font-mono text-[12px] outline-none" />
                <Button type="button" size="sm" onClick={copy}>
                  {copied ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
                  {t("copy")}
                </Button>
              </div>
              <p className="text-[12px] leading-relaxed text-muted-foreground">{t("hint")}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
