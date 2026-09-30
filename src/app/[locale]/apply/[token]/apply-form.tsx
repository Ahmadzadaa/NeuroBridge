"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { signIn } from "next-auth/react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, ChevronDown, ChevronLeft, ChevronsUpDown, Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/ios";
import { cn } from "@/lib/utils";
import type { Notice } from "@/lib/consent/notices";
import type { DepartmentOption, UniversityOption } from "@/lib/reference/academic-lists";

const OTHER = "__other__";
/** Same range as MIN_STUDY_YEAR..MAX_STUDY_YEAR in validation/schemas (not imported: keeps zod out of the client bundle). */
const STUDY_YEARS = [1, 2, 3, 4, 5, 6];
const STEPS = ["personalHeading", "academicHeading", "consentHeading"] as const;
const EASE = [0.32, 0.72, 0, 1] as const;

export function ApplyForm({
  token,
  locale,
  universities,
  departments,
  notices,
}: {
  token: string;
  locale: string;
  universities: UniversityOption[];
  departments: DepartmentOption[];
  notices: Notice[];
}) {
  const t = useTranslations("apply");
  const tc = useTranslations("common");
  const router = useRouter();
  const reduced = useReducedMotion();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    universityId: "",
    universityText: "",
    departmentId: "",
    departmentText: "",
    studyYear: "",
  });
  const [ack, setAck] = useState(false);
  const [dataUse, setDataUse] = useState(false);
  const [opportunities, setOpportunities] = useState<"yes" | "no" | "">("");
  const [psychShare, setPsychShare] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  // Departments grouped by field of study for <optgroup>.
  const groups = departments.reduce<Record<string, DepartmentOption[]>>((acc, d) => {
    (acc[d.field ?? t("otherField")] ??= []).push(d);
    return acc;
  }, {});

  function go(to: number) {
    setDirection(to > step ? 1 : -1);
    setError(null);
    setStep(to);
  }

  async function register() {
    setSubmitting(true);
    const picked = (id: string) => (id && id !== OTHER ? id : null);
    const res = await fetch("/api/registration", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        locale,
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone || undefined,
        password: form.password,
        universityId: picked(form.universityId),
        // Free text only for "not listed"; omitted otherwise (the schema takes a string or nothing).
        university: form.universityId === OTHER ? form.universityText : undefined,
        departmentId: picked(form.departmentId),
        specialty: form.departmentId === OTHER ? form.departmentText : undefined,
        studyYear: form.studyYear ? Number(form.studyYear) : null,
        consents: {
          privacyNotice: ack,
          dataUse,
          opportunities: opportunities === "yes",
          psychResultsShare: psychShare,
        },
      }),
    }).catch(() => null);

    if (!res?.ok) {
      const data = await res?.json().catch(() => null);
      const code: string | undefined = data?.code;
      setError(
        res?.status === 409 ? t("errors.alreadyRegistered")
        : res?.status === 429 ? t("errors.rateLimited")
        : code === "SEAT_LIMIT_REACHED" || code === "PROGRAM_CAPACITY_REACHED" ? t("programFull")
        : code === "PRIVACY_CONSENT_REQUIRED" ? t("errors.consentRequired")
        : res?.status === 400 ? t("errors.invalid")
        : t("errors.generic")
      );
      setSubmitting(false);
      return;
    }

    // Straight into the program instead of a separate login step.
    const login = await signIn("credentials", { email: form.email.trim(), password: form.password, redirect: false });
    router.push(login?.error ? "/login" : "/participant/program");
  }

  // Each step renders only its own fields, so the browser validates just those.
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (step < STEPS.length - 1) go(step + 1);
    else void register();
  }

  const slide = reduced
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, x: 28 * direction },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -28 * direction },
      };

  return (
    <form onSubmit={handleSubmit} className="mt-6">
      {/* Progress: three segments that fill as the student advances. */}
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between text-[13px]">
          <span className="font-semibold text-foreground">{t(STEPS[step])}</span>
          <span className="tabular-nums text-muted-foreground">
            {t("stepOf", { current: step + 1, total: STEPS.length })}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-1.5" aria-hidden="true">
          {STEPS.map((key, i) => (
            <div key={key} className="h-1.5 overflow-hidden rounded-full bg-muted">
              <motion.div
                className="h-full rounded-full bg-primary"
                initial={false}
                animate={{ width: i <= step ? "100%" : "0%" }}
                transition={{ duration: reduced ? 0 : 0.45, ease: EASE }}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="relative -m-1.5 overflow-hidden p-1.5">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={step} {...slide} transition={{ duration: 0.3, ease: EASE }} className="space-y-4">
            {step === 0 && (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={t("firstName")} htmlFor="firstName">
                    <Input id="firstName" required maxLength={100} autoComplete="given-name" autoFocus value={form.firstName} onChange={set("firstName")} />
                  </Field>
                  <Field label={t("lastName")} htmlFor="lastName">
                    <Input id="lastName" required maxLength={100} autoComplete="family-name" value={form.lastName} onChange={set("lastName")} />
                  </Field>
                </div>
                <Field label={t("email")} htmlFor="email">
                  <Input id="email" type="email" required autoComplete="email" inputMode="email" value={form.email} onChange={set("email")} />
                </Field>
                <Field label={t("phone")} htmlFor="phone">
                  <Input id="phone" type="tel" required maxLength={30} autoComplete="tel" inputMode="tel" value={form.phone} onChange={set("phone")} />
                </Field>
                <Field label={t("password")} htmlFor="password" hint={t("passwordHint")}>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={8}
                      maxLength={128}
                      autoComplete="new-password"
                      value={form.password}
                      onChange={set("password")}
                      className="pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? t("hidePassword") : t("showPassword")}
                      className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </Field>
              </>
            )}

            {step === 1 && (
              <>
                <Field label={t("university")} htmlFor="universityId">
                  <NativeSelect id="universityId" value={form.universityId} onChange={set("universityId")} placeholder={t("choose")}>
                    {universities.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.city ? `${u.name} (${u.city})` : u.name}
                      </option>
                    ))}
                    <option value={OTHER}>{t("notListed")}</option>
                  </NativeSelect>
                </Field>
                {form.universityId === OTHER && (
                  <Field label={t("universityOther")} htmlFor="universityText">
                    <Input id="universityText" required maxLength={200} value={form.universityText} onChange={set("universityText")} />
                  </Field>
                )}
                <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_160px]">
                  <Field label={t("department")} htmlFor="departmentId">
                    <NativeSelect id="departmentId" value={form.departmentId} onChange={set("departmentId")} placeholder={t("choose")}>
                      {Object.entries(groups).map(([field, list]) => (
                        <optgroup key={field} label={field}>
                          {list.map((d) => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                          ))}
                        </optgroup>
                      ))}
                      <option value={OTHER}>{t("notListed")}</option>
                    </NativeSelect>
                  </Field>
                  <Field label={t("studyYear")} htmlFor="studyYear">
                    <NativeSelect id="studyYear" value={form.studyYear} onChange={set("studyYear")} placeholder={t("choose")}>
                      {STUDY_YEARS.map((y) => (
                        <option key={y} value={y}>{t("yearOption", { year: y })}</option>
                      ))}
                    </NativeSelect>
                  </Field>
                </div>
                {form.departmentId === OTHER && (
                  <Field label={t("departmentOther")} htmlFor="departmentText">
                    <Input id="departmentText" required maxLength={200} value={form.departmentText} onChange={set("departmentText")} />
                  </Field>
                )}
              </>
            )}

            {step === 2 && (
              <>
                <div className="overflow-hidden rounded-[18px] ring-1 ring-border/70 [&>*+*]:border-t [&>*+*]:border-border/70">
                  {notices.map((notice) => (
                    <details key={notice.code} className="group">
                      <summary className="flex min-h-[52px] cursor-pointer list-none items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/50 [&::-webkit-details-marker]:hidden">
                        <ShieldCheck className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                        <span className="min-w-0 flex-1 text-[15px] font-medium text-foreground">
                          {notice.title}
                          {notice.draft && <span className="ml-2 text-xs font-normal text-muted-foreground">({t("draftTranslation")})</span>}
                        </span>
                        <span className="text-[13px] text-muted-foreground">{t("readNotice")}</span>
                        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300 group-open:rotate-180" aria-hidden="true" />
                      </summary>
                      <div className="max-h-72 space-y-2 overflow-y-auto bg-muted/30 px-4 py-3 text-[13px] leading-relaxed text-muted-foreground">
                        {notice.paragraphs.map((p, i) => (
                          <p key={i}>{p}</p>
                        ))}
                      </div>
                    </details>
                  ))}
                </div>

                <CheckRow checked={ack} onChange={setAck} required>
                  {notices.map((n) => n.acknowledge).join(" ")} <span className="text-destructive">*</span>
                </CheckRow>
                <CheckRow checked={dataUse} onChange={setDataUse}>
                  {notices[0]?.dataUse}
                </CheckRow>

                <div role="radiogroup" aria-labelledby="opportunities-q" className="space-y-2.5">
                  <p id="opportunities-q" className="px-1 text-[14px] leading-relaxed text-foreground">
                    {t("opportunitiesQuestion")}
                  </p>
                  {/* Segmented control over real radios, so "required" still validates. */}
                  <div className="grid grid-cols-2 gap-1 rounded-[14px] bg-muted p-1">
                    {(["yes", "no"] as const).map((v) => (
                      <label key={v} className="relative flex h-10 cursor-pointer items-center justify-center rounded-[10px] text-[14px] font-semibold">
                        <input
                          type="radio"
                          name="opportunities"
                          required
                          checked={opportunities === v}
                          onChange={() => setOpportunities(v)}
                          className="peer absolute inset-0 cursor-pointer appearance-none rounded-[10px] outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        />
                        {opportunities === v && (
                          <motion.span
                            layoutId={reduced ? undefined : "opportunities-pill"}
                            className="absolute inset-0 rounded-[10px] bg-card shadow-sm ring-1 ring-border/50"
                            transition={{ type: "spring", stiffness: 500, damping: 38 }}
                          />
                        )}
                        <span className={cn("pointer-events-none relative", opportunities === v ? "text-foreground" : "text-muted-foreground")}>
                          {t(v === "yes" ? "opportunitiesYes" : "opportunitiesNo")}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <CheckRow checked={psychShare} onChange={setPsychShare}>
                  {t("psychShare")}
                </CheckRow>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {error && (
          <motion.p
            role="alert"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-5 rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      <div className="mt-7 flex items-center gap-3">
        {step > 0 && (
          <Button type="button" variant="outline" size="lg" onClick={() => go(step - 1)} disabled={submitting} className="px-4" aria-label={tc("back")}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
        )}
        <Button type="submit" size="lg" className="flex-1" disabled={submitting}>
          {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {step < STEPS.length - 1 ? t("continue") : submitting ? t("submitting") : t("submit")}
        </Button>
      </div>
      <p className="mt-4 flex items-center justify-center gap-1.5 text-[12px] text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5 text-success" aria-hidden="true" />
        {t("secureNote")}
      </p>
    </form>
  );
}

/** A native select (keeps the phone's own picker) dressed as a filled iOS field. */
function NativeSelect({
  id,
  value,
  onChange,
  placeholder,
  children,
}: {
  id: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  placeholder: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <select
        id={id}
        required
        value={value}
        onChange={onChange}
        className={cn(
          "h-11 w-full appearance-none truncate rounded-xl border border-transparent bg-muted/60 pl-3.5 pr-10 text-[15px] outline-none transition-[background-color,box-shadow,border-color] duration-200 hover:bg-muted focus-visible:border-primary/40 focus-visible:bg-card focus-visible:ring-4 focus-visible:ring-primary/15",
          value ? "text-foreground" : "text-muted-foreground"
        )}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {children}
      </select>
      <ChevronsUpDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
    </div>
  );
}

function CheckRow({
  checked,
  onChange,
  required,
  children,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label
      className={cn(
        "flex min-h-11 cursor-pointer items-start gap-3 rounded-2xl px-3 py-3 text-[14px] leading-relaxed text-foreground transition-colors",
        checked ? "bg-primary/[0.06]" : "hover:bg-muted/50"
      )}
    >
      <span className="relative mt-0.5 flex h-[22px] w-[22px] shrink-0 items-center justify-center">
        <input
          type="checkbox"
          required={required}
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="peer h-[22px] w-[22px] cursor-pointer appearance-none rounded-[7px] border-2 border-muted-foreground/40 transition-colors checked:border-primary checked:bg-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
        />
        <Check
          className="pointer-events-none absolute h-3.5 w-3.5 scale-50 text-white opacity-0 transition-all duration-200 peer-checked:scale-100 peer-checked:opacity-100"
          strokeWidth={3.5}
          aria-hidden="true"
        />
      </span>
      <span>{children}</span>
    </label>
  );
}
