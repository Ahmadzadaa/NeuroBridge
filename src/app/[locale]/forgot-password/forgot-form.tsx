"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, KeyRound, MailCheck } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, IconTile } from "@/components/ui/ios";

export function ForgotPasswordForm() {
  const t = useTranslations("passwordReset");
  const locale = useLocale();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), locale }),
      });
      if (res.ok) setSent(true);
      else setError(res.status === 429 ? t("rateLimited") : res.status === 400 ? t("invalidEmail") : t("generic"));
    } catch {
      setError(t("generic"));
    }
    setSubmitting(false);
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      {sent ? (
        <motion.div
          key="sent"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center text-center"
        >
          <IconTile icon={MailCheck} tone="emerald" size="lg" />
          <h1 className="mt-4 text-[26px] font-bold tracking-[-0.6px] text-foreground">{t("sentTitle")}</h1>
          <p className="mt-1.5 text-[15px] leading-relaxed text-muted-foreground">{t("sentText", { email: email.trim() })}</p>
          <Link href="/login" className="mt-7 inline-flex items-center gap-1.5 text-[15px] font-medium text-primary hover:underline">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {t("backToLogin")}
          </Link>
        </motion.div>
      ) : (
        <motion.div key="form" exit={{ opacity: 0, y: -8 }}>
          <div className="flex flex-col items-center text-center">
            <IconTile icon={KeyRound} tone="indigo" size="lg" />
            <h1 className="mt-4 text-[26px] font-bold tracking-[-0.6px] text-foreground">{t("title")}</h1>
            <p className="mt-1.5 text-[15px] leading-relaxed text-muted-foreground">{t("subtitle")}</p>
          </div>
          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            <Field label={t("email")} htmlFor="email">
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            {error && <p role="alert" className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>}
            <Button type="submit" size="lg" className="w-full" disabled={submitting || !email.trim()}>
              {submitting ? t("sending") : t("submit")}
            </Button>
          </form>
          <div className="mt-5 text-center">
            <Link href="/login" className="inline-flex items-center gap-1.5 text-[14px] font-medium text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              {t("backToLogin")}
            </Link>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
