"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useApiErrorMessage } from "@/lib/api/api-error";
import { LEAD_STATUSES, type LeadStatus } from "@/lib/leads/lead-status";
import { cn } from "@/lib/utils";

const TONE: Record<LeadStatus, string> = {
  NEW: "bg-primary/10 text-primary ring-primary/30",
  CONTACTED: "bg-amber-500/10 text-amber-600 ring-amber-500/30 dark:text-amber-400",
  QUALIFIED: "bg-emerald-500/10 text-emerald-600 ring-emerald-500/30 dark:text-emerald-400",
  CLOSED: "bg-muted text-muted-foreground ring-border",
};

/** The lead's pipeline status, changed in place. */
export function LeadStatusSelect({ id, status }: { id: string; status: LeadStatus }) {
  const t = useTranslations("superAdmin.leads");
  const apiError = useApiErrorMessage();
  const router = useRouter();
  const [value, setValue] = useState(status);
  const [saving, setSaving] = useState(false);

  async function change(next: LeadStatus) {
    const previous = value;
    setValue(next);
    setSaving(true);
    try {
      const res = await fetch(`/api/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) {
        setValue(previous);
        toast.error(apiError(await res.json().catch(() => null)));
        return;
      }
      toast.success(t("statusSaved"));
      router.refresh();
    } catch {
      setValue(previous);
      toast.error(apiError(null));
    } finally {
      setSaving(false);
    }
  }

  return (
    <select
      value={value}
      disabled={saving}
      aria-label={t("statusLabel")}
      onChange={(e) => void change(e.target.value as LeadStatus)}
      className={cn("h-8 rounded-full px-3 text-[12px] font-semibold ring-1 outline-none transition-colors disabled:opacity-60", TONE[value])}
    >
      {LEAD_STATUSES.map((s) => (
        <option key={s} value={s}>
          {t(`status.${s}`)}
        </option>
      ))}
    </select>
  );
}
