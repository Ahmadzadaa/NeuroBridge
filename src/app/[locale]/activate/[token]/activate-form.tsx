"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/ios";

const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,128}$/;

export function ActivateForm({ token }: { token: string }) {
  const t = useTranslations("activation");
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!PASSWORD_RULE.test(password)) return setError(t("errors.weak"));
    if (password !== confirm) return setError(t("errors.mismatch"));

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/activation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      if (res.ok) {
        router.push("/login?activated=1");
        return;
      }
      const data = await res.json().catch(() => null);
      const code = data?.code as string | undefined;
      setError(
        code === "EXPIRED" || code === "USED" || code === "INVALID"
          ? t(`state.${code}`)
          : res.status === 429
            ? t("errors.rateLimited")
            : t("errors.generic")
      );
    } catch {
      setError(t("errors.generic"));
    }
    setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="mt-7 space-y-4">
      <Field label={t("password")} htmlFor="password" hint={t("passwordHint")}>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </Field>
      <Field label={t("confirm")} htmlFor="confirm">
        <Input
          id="confirm"
          type="password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </Field>
      {error && <p role="alert" className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>}
      <Button type="submit" size="lg" className="w-full" disabled={submitting}>
        {submitting ? t("saving") : t("submit")}
      </Button>
    </form>
  );
}
