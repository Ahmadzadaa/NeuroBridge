"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatKurus } from "@/lib/billing/money";

export type CalculatorService = {
  code: string;
  name: string;
  tiers: {
    minParticipants: number;
    maxParticipants: number | null;
    pricePerParticipant: number;
    currency: string;
  }[];
};

type QuoteLine = { serviceCode: string; participantCount: number; unitPrice: number; subtotal: number };
type Quote = { items: QuoteLine[]; total: number; currency: string };

/** Participant counts above this are rejected by the API (see quoteSchema). */
const MAX_PARTICIPANTS = 100_000;
const PRICING_ERRORS = [
  "EMPTY_QUOTE",
  "INVALID_PARTICIPANT_COUNT",
  "DUPLICATE_SERVICE",
  "UNKNOWN_SERVICE",
  "NO_MATCHING_TIER",
  "CURRENCY_MISMATCH",
  "EMAIL_TAKEN",
  "PAYMENT_PROVIDER",
] as const;

export function PricingCalculator({
  services,
  locale,
}: {
  services: CalculatorService[];
  locale: string;
}) {
  const t = useTranslations("pricing");
  // A fixed locale: Node and browsers ship different ICU data for az-AZ, which
  // made the server and client render different text (hydration mismatch).
  const money = (kurus: number, currency = "TRY") => formatKurus(kurus, currency, "tr-TR");

  const [counts, setCounts] = useState<Record<string, string>>({});
  const [contact, setContact] = useState({ institutionName: "", contactName: "", contactEmail: "" });
  // Keyed by the selection it was computed for, so a stale total is never shown.
  const [result, setResult] = useState<{ key: string; quote?: Quote; error?: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const items = useMemo(
    () =>
      Object.entries(counts).map(([serviceCode, value]) => ({
        serviceCode,
        participantCount: Number(value),
      })),
    [counts]
  );
  const itemsKey = JSON.stringify(items);
  const countsValid =
    items.length > 0 &&
    items.every(
      (i) => Number.isInteger(i.participantCount) && i.participantCount >= 1 && i.participantCount <= MAX_PARTICIPANTS
    );

  function errorMessage(code: unknown): string {
    return PRICING_ERRORS.includes(code as (typeof PRICING_ERRORS)[number])
      ? t(`errors.${code as (typeof PRICING_ERRORS)[number]}`)
      : t("errors.generic");
  }

  // Live quote, debounced. The server is the only source of prices.
  useEffect(() => {
    if (!countsValid) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/pricing/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items }),
          signal: controller.signal,
        });
        const data = await res.json();
        setResult(res.ok ? { key: itemsKey, quote: data } : { key: itemsKey, error: errorMessage(data.code) });
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setResult({ key: itemsKey, error: t("errors.generic") });
        }
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
    // errorMessage/t are stable for a given locale.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsKey]);

  const current = countsValid && result?.key === itemsKey ? result : null;
  const shownQuote = current?.quote ?? null;
  const shownQuoteError = countsValid ? (current?.error ?? null) : t("errors.INVALID_PARTICIPANT_COUNT");

  function toggleService(code: string, checked: boolean) {
    setCounts((prev) => {
      const next = { ...prev };
      if (checked) next[code] = "1";
      else delete next[code];
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/pricing/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...contact, locale, items }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(res.status === 429 ? t("errors.rateLimited") : errorMessage(data.code));
        setSubmitting(false);
        return;
      }
      window.location.assign(data.checkoutUrl);
    } catch {
      setSubmitError(t("errors.generic"));
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("servicesHeading")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {services.map((service) => {
            const selected = service.code in counts;
            return (
              <div key={service.code} className="rounded-lg border border-border p-4">
                <label className="flex min-h-11 cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-primary"
                    checked={selected}
                    onChange={(e) => toggleService(service.code, e.target.checked)}
                  />
                  <span className="font-medium text-foreground">{service.name}</span>
                </label>
                <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 pl-7 text-xs text-muted-foreground">
                  {service.tiers.map((tier) => (
                    <li key={tier.minParticipants}>
                      {tier.maxParticipants === null
                        ? t("tierOpen", { min: tier.minParticipants })
                        : t("tierRange", { min: tier.minParticipants, max: tier.maxParticipants })}
                      {": "}
                      {t("perParticipant", { price: money(tier.pricePerParticipant, tier.currency) })}
                    </li>
                  ))}
                </ul>
                {selected && (
                  <div className="mt-3 flex items-center gap-3 pl-7">
                    <Label htmlFor={`count-${service.code}`}>{t("participants")}</Label>
                    <Input
                      id={`count-${service.code}`}
                      type="number"
                      min={1}
                      max={MAX_PARTICIPANTS}
                      step={1}
                      required
                      aria-label={`${service.name}: ${t("participants")}`}
                      className="w-32"
                      value={counts[service.code]}
                      onChange={(e) => setCounts((prev) => ({ ...prev, [service.code]: e.target.value }))}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("summaryHeading")}</CardTitle>
        </CardHeader>
        <CardContent aria-live="polite">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("selectPrompt")}</p>
          ) : shownQuoteError ? (
            <p className="text-sm text-destructive">{shownQuoteError}</p>
          ) : shownQuote ? (
            <div className="space-y-2 text-sm">
              {shownQuote.items.map((line) => (
                <div key={line.serviceCode} className="flex justify-between gap-4">
                  <span className="text-muted-foreground">
                    {services.find((s) => s.code === line.serviceCode)?.name} ·{" "}
                    {line.participantCount} × {money(line.unitPrice, shownQuote.currency)}
                  </span>
                  <span className="font-medium text-foreground">{money(line.subtotal, shownQuote.currency)}</span>
                </div>
              ))}
              <div className="flex justify-between border-t border-border pt-2 text-base font-semibold text-foreground">
                <span>{t("total")}</span>
                <span>{money(shownQuote.total, shownQuote.currency)}</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t("calculating")}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("contactHeading")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(["institutionName", "contactName", "contactEmail"] as const).map((field) => (
            <div key={field} className="space-y-1.5">
              <Label htmlFor={field}>{t(`fields.${field}`)}</Label>
              <Input
                id={field}
                type={field === "contactEmail" ? "email" : "text"}
                required
                minLength={field === "contactEmail" ? undefined : 2}
                value={contact[field]}
                onChange={(e) => setContact((prev) => ({ ...prev, [field]: e.target.value }))}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {submitError && (
        <p role="alert" className="text-sm text-destructive">
          {submitError}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={submitting || !shownQuote}>
        {submitting
          ? t("redirecting")
          : shownQuote
            ? t("pay", { total: money(shownQuote.total, shownQuote.currency) })
            : t("payDisabled")}
      </Button>
    </form>
  );
}
