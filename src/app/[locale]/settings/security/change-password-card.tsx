"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { KeyRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, IconTile } from "@/components/ui/ios";

const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,128}$/;

export function ChangePasswordCard() {
  const t = useTranslations("account.password");
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!PASSWORD_RULE.test(next)) return setError(t("weak"));
    if (next !== confirm) return setError(t("mismatch"));
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/profile/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      if (res.ok) {
        toast.success(t("changed"));
        setCurrent("");
        setNext("");
        setConfirm("");
      } else {
        const data = await res.json().catch(() => null);
        setError(
          data?.code === "WRONG_CURRENT_PASSWORD"
            ? t("wrongCurrent")
            : res.status === 429
              ? t("rateLimited")
              : t("generic")
        );
      }
    } catch {
      setError(t("generic"));
    }
    setSaving(false);
  }

  return (
    <section className="rounded-[20px] bg-card p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)] ring-1 ring-border/60 sm:p-6">
      <div className="flex items-start gap-3">
        <IconTile icon={KeyRound} tone="amber" />
        <div>
          <h2 className="text-[17px] font-semibold tracking-[-0.3px] text-foreground">{t("title")}</h2>
          <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">{t("subtitle")}</p>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <Field label={t("current")} htmlFor="current-password">
          <Input
            id="current-password"
            type="password"
            autoComplete="current-password"
            required
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("new")} htmlFor="new-password" hint={t("hint")}>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              required
              value={next}
              onChange={(e) => setNext(e.target.value)}
            />
          </Field>
          <Field label={t("confirm")} htmlFor="confirm-password">
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </Field>
        </div>
        {error && (
          <p role="alert" className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" disabled={saving || !current || !next || !confirm}>
          {saving ? t("saving") : t("submit")}
        </Button>
      </form>
    </section>
  );
}
