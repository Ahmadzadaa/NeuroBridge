"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Status = "idle" | "submitting" | "sent" | "error";

/**
 * Demo request form.
 *
 * The `website` field is the honeypot: hidden from sight and from assistive
 * technology, but present in the DOM for an automated form-filler to complete.
 * It is never shown to a person, so it must never be a required field and must
 * never carry a visible label.
 */
export function ContactForm() {
  const t = useTranslations("marketing.contact.form");
  const locale = useLocale();
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setError(null);

    const data = new FormData(event.currentTarget);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.get("name"),
          company: data.get("company"),
          email: data.get("email"),
          phone: data.get("phone") || undefined,
          seatCount: data.get("seatCount") || undefined,
          message: data.get("message") || undefined,
          website: data.get("website") || undefined,
          locale,
          source: typeof window !== "undefined" ? window.location.search.slice(0, 200) : undefined,
        }),
      });

      if (res.status === 429) {
        setStatus("error");
        setError(t("rateLimited"));
        return;
      }
      if (!res.ok) {
        setStatus("error");
        setError(t("failed"));
        return;
      }

      setStatus("sent");
    } catch {
      setStatus("error");
      setError(t("failed"));
    }
  }

  if (status === "sent") {
    return (
      <div className="rounded-2xl border border-success/30 bg-success/5 p-8 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-success" aria-hidden="true" />
        <h2 className="mt-4 text-[18px] font-semibold text-foreground">
          {t("successTitle")}
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-[14px] leading-[1.7] text-muted-foreground">
          {t("successBody")}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="name" label={t("name")} required autoComplete="name" />
        <Field name="company" label={t("company")} required autoComplete="organization" />
        <Field name="email" label={t("email")} type="email" required autoComplete="email" />
        <Field name="phone" label={t("phone")} type="tel" autoComplete="tel" />
      </div>

      <Field name="seatCount" label={t("seatCount")} hint={t("seatCountHint")} />

      <div>
        <Label htmlFor="lead-message" className="mb-1.5 block">
          {t("message")}
        </Label>
        <Textarea
          id="lead-message"
          name="message"
          rows={5}
          maxLength={2000}
          className="rounded-xl"
        />
      </div>

      {/* Honeypot. The wrapper is aria-hidden and off-screen, so this field
          is announced to nobody and seen by nobody; only an automated
          form-filler completes it. It carries no label for the same reason —
          there is no one to read it. */}
      <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <input
          id="lead-website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      {error && (
        <p role="alert" className="text-[13px] font-medium text-danger">
          {error}
        </p>
      )}

      <Button
        type="submit"
        size="lg"
        className="w-full rounded-xl sm:w-auto"
        disabled={status === "submitting"}
      >
        {status === "submitting" && (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
        )}
        {t("submit")}
      </Button>

      <p className="text-[12px] leading-[1.6] text-muted-foreground">{t("consent")}</p>
    </form>
  );
}

function Field({
  name,
  label,
  hint,
  type = "text",
  required = false,
  autoComplete,
}: {
  name: string;
  label: string;
  hint?: string;
  type?: string;
  required?: boolean;
  autoComplete?: string;
}) {
  const id = `lead-${name}`;
  return (
    <div>
      <Label htmlFor={id} className="mb-1.5 block">
        {label}
        {required && (
          <span className="ml-0.5 text-danger" aria-hidden="true">
            *
          </span>
        )}
      </Label>
      <Input
        id={id}
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className="rounded-xl"
      />
      {hint && (
        <p id={`${id}-hint`} className="mt-1 text-[12px] text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  );
}
