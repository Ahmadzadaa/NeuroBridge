"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";
import {
  BookOpen,
  Briefcase,
  GraduationCap,
  Layers,
  Loader2,
  Lock,
  Minus,
  Plus,
  ShieldCheck,
  Sparkles,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
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

type Tier = CalculatorService["tiers"][number];
type QuoteLine = { serviceCode: string; participantCount: number; unitPrice: number; subtotal: number };
type Quote = { items: QuoteLine[]; total: number; currency: string };

/** Participant counts above this are rejected by the API (see quoteSchema). */
const MAX_PARTICIPANTS = 100_000;
const QUICK_PICKS = [25, 50, 100, 250];
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

/** iOS-style app icons: one glyph on a gradient squircle per service. */
const SERVICE_ICONS: Record<string, { icon: LucideIcon; gradient: string }> = {
  HACKATHON: { icon: Trophy, gradient: "from-orange-400 to-rose-500" },
  TEACHERS: { icon: GraduationCap, gradient: "from-sky-400 to-blue-600" },
  SIMULATIONS: { icon: Briefcase, gradient: "from-violet-500 to-indigo-600" },
  TRAININGS: { icon: BookOpen, gradient: "from-emerald-400 to-teal-600" },
  AI_TOOLS: { icon: Sparkles, gradient: "from-fuchsia-500 to-purple-600" },
};
const FALLBACK_ICON = { icon: Layers, gradient: "from-slate-400 to-slate-600" };

/** Apple's default sheet curve. */
const EASE = [0.32, 0.72, 0, 1] as const;

// A fixed locale: Node and browsers ship different ICU data for az-AZ, which
// made the server and client render different text (hydration mismatch).
const money = (kurus: number, currency = "TRY") => formatKurus(kurus, currency, "tr-TR");

/** Display-only: the server quote stays the single source of prices. */
function tierFor(tiers: Tier[], count: number): Tier | undefined {
  return tiers.find((t) => count >= t.minParticipants && (t.maxParticipants === null || count <= t.maxParticipants));
}

/**
 * "public": a new organisation buys its first programme (institution details
 * asked, account provisioned on payment). "tenant": a signed-in admin buys
 * another programme for their organisation.
 */
export function PricingCalculator({
  services,
  locale,
  mode = "public",
}: {
  services: CalculatorService[];
  locale: string;
  mode?: "public" | "tenant";
}) {
  const t = useTranslations("pricing");
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [contact, setContact] = useState({ institutionName: "", contactName: "", contactEmail: "" });
  // Keyed by the selection it was computed for, so a stale total is never shown.
  const [result, setResult] = useState<{ key: string; quote?: Quote; error?: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const items = useMemo(
    () => Object.entries(counts).map(([serviceCode, value]) => ({ serviceCode, participantCount: Number(value) })),
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
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
    // errorMessage/t are stable for a given locale.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsKey]);

  const current = countsValid && result?.key === itemsKey ? result : null;
  const quote = current?.quote ?? null;
  const quoteError = countsValid ? (current?.error ?? null) : t("errors.INVALID_PARTICIPANT_COUNT");
  const calculating = items.length > 0 && !quote && !quoteError;

  function toggleService(code: string) {
    setCounts((prev) => {
      const next = { ...prev };
      if (code in next) delete next[code];
      else next[code] = "25";
      return next;
    });
  }

  function setCount(code: string, value: string) {
    setCounts((prev) => ({ ...prev, [code]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch(mode === "tenant" ? "/api/tenant/program-orders" : "/api/pricing/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "tenant" ? { locale, items } : { ...contact, locale, items }),
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

  const payLabel = submitting ? t("redirecting") : quote ? t("pay", { total: money(quote.total, quote.currency) }) : t("payDisabled");

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-[minmax(0,1fr)] gap-8 pb-28 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:pb-0">
      <section aria-labelledby="services-heading">
        <div className="mb-3 flex items-baseline justify-between px-1">
          <h2 id="services-heading" className="text-[13px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">
            {t("servicesHeading")}
          </h2>
          <AnimatePresence initial={false}>
            {items.length > 0 && (
              <motion.span
                key="count"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[12px] font-semibold text-primary"
              >
                {t("selectedCount", { count: items.length })}
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <ul className="overflow-hidden rounded-[22px] bg-card shadow-sm ring-1 ring-border/60">
          {services.map((service, index) => (
            <ServiceRow
              key={service.code}
              service={service}
              first={index === 0}
              value={counts[service.code]}
              onToggle={() => toggleService(service.code)}
              onChange={(value) => setCount(service.code, value)}
            />
          ))}
        </ul>
      </section>

      <aside id="checkout" className="space-y-4 lg:sticky lg:top-24">
        <Summary services={services} itemsCount={items.length} quote={quote} error={quoteError} calculating={calculating} />

        {mode === "public" && (
        <fieldset className="space-y-2">
          <legend className="mb-2 px-1 text-[13px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">
            {t("contactHeading")}
          </legend>
          <div className="overflow-hidden rounded-[22px] bg-card shadow-sm ring-1 ring-border/60">
            {(["institutionName", "contactName", "contactEmail"] as const).map((field, index) => (
              <label
                key={field}
                className={cn(
                  "flex min-h-[52px] items-center gap-3 px-4 focus-within:bg-subtle/60",
                  index > 0 && "border-t border-border/60"
                )}
              >
                <span className="w-28 shrink-0 text-[14px] text-foreground">{t(`fields.${field}`)}</span>
                <input
                  type={field === "contactEmail" ? "email" : "text"}
                  required
                  minLength={field === "contactEmail" ? undefined : 2}
                  autoComplete={field === "contactEmail" ? "email" : field === "contactName" ? "name" : "organization"}
                  value={contact[field]}
                  onChange={(e) => setContact((prev) => ({ ...prev, [field]: e.target.value }))}
                  className="h-[52px] min-w-0 flex-1 bg-transparent text-right text-[15px] text-foreground outline-none placeholder:text-muted-foreground"
                />
              </label>
            ))}
          </div>
        </fieldset>
        )}

        <AnimatePresence>
          {submitError && (
            <motion.p
              role="alert"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive"
            >
              {submitError}
            </motion.p>
          )}
        </AnimatePresence>

        <PayButton disabled={submitting || !quote} submitting={submitting} label={payLabel} className="hidden lg:flex" />

        <p className="flex items-start gap-2 px-1 text-[12px] leading-[1.6] text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
          <span>
            {t("secure")}. {mode === "tenant" ? t("tenantNote") : t("activationNote")}
          </span>
        </p>
      </aside>

      {/* Phones: the total and the action stay under the thumb. */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/80 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl lg:hidden">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[12px] text-muted-foreground">{t("total")}</p>
            <p className="truncate text-[20px] font-bold tracking-[-0.4px] text-foreground">
              {quote ? <AnimatedMoney value={quote.total} currency={quote.currency} /> : "—"}
            </p>
          </div>
          <PayButton disabled={submitting || !quote} submitting={submitting} label={t("payDisabled")} className="w-auto px-7" />
        </div>
      </div>
    </form>
  );
}

function ServiceRow({
  service,
  first,
  value,
  onToggle,
  onChange,
}: {
  service: CalculatorService;
  first: boolean;
  value: string | undefined;
  onToggle: () => void;
  onChange: (value: string) => void;
}) {
  const t = useTranslations("pricing");
  const reduced = useReducedMotion();
  const selected = value !== undefined;
  const { icon: Icon, gradient } = SERVICE_ICONS[service.code] ?? FALLBACK_ICON;
  const cheapest = service.tiers.reduce<Tier | null>(
    (min, tier) => (!min || tier.pricePerParticipant < min.pricePerParticipant ? tier : min),
    null
  );
  const count = Number(value);
  const active = selected ? tierFor(service.tiers, count) : undefined;
  const description = t.has(`descriptions.${service.code}`) ? t(`descriptions.${service.code}`) : null;
  const switchId = `svc-${service.code}`;

  function step(delta: number) {
    const base = Number.isFinite(count) ? count : 0;
    onChange(String(Math.min(MAX_PARTICIPANTS, Math.max(1, Math.round(base) + delta))));
  }

  return (
    <li className={cn(!first && "border-t border-border/60")}>
      <div className="flex items-center gap-3.5 px-4 py-3.5">
        <span
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-gradient-to-br text-white shadow-sm",
            gradient
          )}
          aria-hidden="true"
        >
          <Icon className="h-[22px] w-[22px]" strokeWidth={2.2} />
        </span>
        <label htmlFor={switchId} className="min-w-0 flex-1 cursor-pointer">
          <span className="block text-[16px] font-semibold tracking-[-0.2px] text-foreground">{service.name}</span>
          {description && <span className="line-clamp-2 block text-[13px] text-muted-foreground">{description}</span>}
          {cheapest && (
            <span className="mt-0.5 block text-[12px] font-medium text-primary">
              {t("fromPrice", { price: money(cheapest.pricePerParticipant, cheapest.currency) })}{" "}
              {t("perParticipantShort")}
            </span>
          )}
        </label>
        <IosSwitch id={switchId} checked={selected} onChange={onToggle} label={service.name} />
      </div>

      <AnimatePresence initial={false}>
        {selected && (
          <motion.div
            key="details"
            initial={reduced ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="space-y-4 px-4 pb-4 sm:pl-[74px]">
              <div className="flex flex-wrap items-center gap-3">
                <Stepper
                  value={value ?? ""}
                  label={`${service.name}: ${t("participants")}`}
                  onChange={onChange}
                  onStep={step}
                />
                <div className="flex flex-wrap gap-1.5" role="group" aria-label={t("quickPick")}>
                  {QUICK_PICKS.map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => onChange(String(n))}
                      aria-pressed={count === n}
                      className={cn(
                        "h-8 rounded-full px-3 text-[13px] font-medium transition-colors active:scale-95",
                        count === n ? "bg-foreground text-background" : "bg-subtle text-foreground hover:bg-subtle/70"
                      )}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Segmented control: which price tier the count falls into. */}
              <div className="grid auto-cols-fr grid-flow-col gap-1 rounded-[14px] bg-subtle p-1" aria-label={t("activeTier")}>
                {service.tiers.map((tier) => {
                  const on = active === tier;
                  return (
                    <div key={tier.minParticipants} className="relative rounded-[10px] px-2 py-1.5 text-center">
                      {on && (
                        <motion.span
                          layoutId={reduced ? undefined : `tier-${service.code}`}
                          className="absolute inset-0 rounded-[10px] bg-card shadow-sm ring-1 ring-border/50"
                          transition={{ type: "spring", stiffness: 500, damping: 38 }}
                        />
                      )}
                      <span className="relative block text-[11px] text-muted-foreground">
                        {tier.maxParticipants === null
                          ? t("tierOpen", { min: tier.minParticipants })
                          : t("tierRange", { min: tier.minParticipants, max: tier.maxParticipants })}
                      </span>
                      <span className={cn("relative block text-[13px] font-semibold", on ? "text-foreground" : "text-muted-foreground")}>
                        {money(tier.pricePerParticipant, tier.currency)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

function IosSwitch({ id, checked, onChange, label }: { id: string; checked: boolean; onChange: () => void; label: string }) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={cn(
        "relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card",
        checked ? "bg-success" : "bg-muted-foreground/25"
      )}
    >
      <motion.span
        className="absolute top-[2px] h-[27px] w-[27px] rounded-full bg-white shadow-[0_3px_8px_rgba(0,0,0,0.15),0_1px_1px_rgba(0,0,0,0.16)]"
        animate={{ left: checked ? 22 : 2 }}
        transition={{ type: "spring", stiffness: 700, damping: 40 }}
      />
    </button>
  );
}

function Stepper({
  value,
  label,
  onChange,
  onStep,
}: {
  value: string;
  label: string;
  onChange: (value: string) => void;
  onStep: (delta: number) => void;
}) {
  const t = useTranslations("pricing");
  const button =
    "flex h-9 w-9 items-center justify-center rounded-full text-foreground transition active:scale-90 hover:bg-card disabled:opacity-40";
  return (
    <div className="flex items-center gap-1 rounded-full bg-subtle p-1">
      <button type="button" className={button} onClick={() => onStep(-1)} disabled={Number(value) <= 1} aria-label={t("decrease")}>
        <Minus className="h-4 w-4" strokeWidth={2.5} />
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={1}
        max={MAX_PARTICIPANTS}
        step={1}
        required
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-16 bg-transparent text-center text-[16px] font-semibold tabular-nums text-foreground outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <button type="button" className={button} onClick={() => onStep(1)} aria-label={t("increase")}>
        <Plus className="h-4 w-4" strokeWidth={2.5} />
      </button>
    </div>
  );
}

function Summary({
  services,
  itemsCount,
  quote,
  error,
  calculating,
}: {
  services: CalculatorService[];
  itemsCount: number;
  quote: Quote | null;
  error: string | null;
  calculating: boolean;
}) {
  const t = useTranslations("pricing");
  return (
    <div className="relative overflow-hidden rounded-[26px] bg-card p-5 shadow-[0_20px_50px_-24px_rgba(15,23,42,0.35)] ring-1 ring-border/60">
      <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary/10 blur-3xl" aria-hidden="true" />
      <div className="relative flex items-center justify-between">
        <h2 className="text-[15px] font-semibold text-foreground">{t("summaryHeading")}</h2>
        {calculating && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-label={t("calculating")} />}
      </div>

      <div className="relative mt-4" aria-live="polite">
        {itemsCount === 0 ? (
          <div className="py-4 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-subtle text-muted-foreground" aria-hidden="true">
              <Layers className="h-6 w-6" />
            </span>
            <p className="mt-3 text-[15px] font-semibold text-foreground">{t("summaryEmptyTitle")}</p>
            <p className="mt-1 text-[13px] leading-[1.6] text-muted-foreground">{t("selectPrompt")}</p>
          </div>
        ) : error ? (
          <p className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>
        ) : (
          <>
            <ul className="space-y-2.5">
              <AnimatePresence initial={false}>
                {quote?.items.map((line) => {
                  const service = services.find((s) => s.code === line.serviceCode);
                  const { icon: Icon, gradient } = SERVICE_ICONS[line.serviceCode] ?? FALLBACK_ICON;
                  return (
                    <motion.li
                      key={line.serviceCode}
                      layout
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -12 }}
                      transition={{ duration: 0.25, ease: EASE }}
                      className="flex items-center gap-3"
                    >
                      <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-gradient-to-br text-white", gradient)} aria-hidden="true">
                        <Icon className="h-4 w-4" strokeWidth={2.2} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-medium text-foreground">{service?.name}</span>
                        <span className="block text-[12px] tabular-nums text-muted-foreground">
                          {t("lineDetail", { count: line.participantCount, price: money(line.unitPrice, quote.currency) })}
                        </span>
                      </span>
                      <span className="text-[14px] font-semibold tabular-nums text-foreground">
                        {money(line.subtotal, quote.currency)}
                      </span>
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ul>
            <div className="mt-4 flex items-end justify-between border-t border-border/60 pt-4">
              <span className="text-[14px] text-muted-foreground">{t("total")}</span>
              <span className="text-[30px] font-bold leading-none tracking-[-0.8px] text-foreground">
                {quote ? <AnimatedMoney value={quote.total} currency={quote.currency} /> : "—"}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/** Rolls the total to its new value instead of snapping. */
function AnimatedMoney({ value, currency }: { value: number; currency: string }) {
  const reduced = useReducedMotion();
  const spring = useSpring(value, { stiffness: 140, damping: 24 });
  const text = useTransform(spring, (v) => money(Math.round(v), currency));
  useEffect(() => {
    if (reduced) spring.jump(value);
    else spring.set(value);
  }, [value, reduced, spring]);
  return <motion.span className="tabular-nums">{text}</motion.span>;
}

function PayButton({
  disabled,
  submitting,
  label,
  className,
}: {
  disabled: boolean;
  submitting: boolean;
  label: string;
  className?: string;
}) {
  return (
    <motion.button
      type="submit"
      disabled={disabled}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      className={cn(
        "flex h-[52px] w-full items-center justify-center gap-2 rounded-full bg-primary text-[16px] font-semibold text-primary-foreground shadow-[0_10px_24px_-10px_var(--primary)] transition-opacity disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none",
        className
      )}
    >
      {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Lock className="h-4 w-4" aria-hidden="true" />}
      {label}
    </motion.button>
  );
}

