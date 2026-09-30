"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { signIn } from "next-auth/react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Notice } from "@/lib/consent/notices";
import type { DepartmentOption, UniversityOption } from "@/lib/reference/academic-lists";

const OTHER = "__other__";
const selectClass =
  "h-10 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring";
/** Same range as MIN_STUDY_YEAR..MAX_STUDY_YEAR in validation/schemas (not imported: keeps zod out of the client bundle). */
const STUDY_YEARS = [1, 2, 3, 4, 5, 6];

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
  const router = useRouter();
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
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

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-6">
      <fieldset className="space-y-4">
        <legend className="text-base font-semibold text-foreground">{t("personalHeading")}</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="firstName" label={t("firstName")}>
            <Input id="firstName" required maxLength={100} autoComplete="given-name" value={form.firstName} onChange={set("firstName")} />
          </Field>
          <Field id="lastName" label={t("lastName")}>
            <Input id="lastName" required maxLength={100} autoComplete="family-name" value={form.lastName} onChange={set("lastName")} />
          </Field>
          <Field id="email" label={t("email")}>
            <Input id="email" type="email" required autoComplete="email" value={form.email} onChange={set("email")} />
          </Field>
          <Field id="phone" label={t("phone")}>
            <Input id="phone" type="tel" required maxLength={30} autoComplete="tel" value={form.phone} onChange={set("phone")} />
          </Field>
        </div>
        <Field id="password" label={t("password")} hint={t("passwordHint")}>
          <Input id="password" type="password" required minLength={8} maxLength={128} autoComplete="new-password" value={form.password} onChange={set("password")} />
        </Field>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-base font-semibold text-foreground">{t("academicHeading")}</legend>
        <Field id="universityId" label={t("university")}>
          <select id="universityId" required className={selectClass} value={form.universityId} onChange={set("universityId")}>
            <option value="" disabled>{t("choose")}</option>
            {universities.map((u) => (
              <option key={u.id} value={u.id}>
                {u.city ? `${u.name} (${u.city})` : u.name}
              </option>
            ))}
            <option value={OTHER}>{t("notListed")}</option>
          </select>
        </Field>
        {form.universityId === OTHER && (
          <Field id="universityText" label={t("universityOther")}>
            <Input id="universityText" required maxLength={200} value={form.universityText} onChange={set("universityText")} />
          </Field>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="departmentId" label={t("department")}>
            <select id="departmentId" required className={selectClass} value={form.departmentId} onChange={set("departmentId")}>
              <option value="" disabled>{t("choose")}</option>
              {Object.entries(groups).map(([field, list]) => (
                <optgroup key={field} label={field}>
                  {list.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </optgroup>
              ))}
              <option value={OTHER}>{t("notListed")}</option>
            </select>
          </Field>
          <Field id="studyYear" label={t("studyYear")}>
            <select id="studyYear" required className={selectClass} value={form.studyYear} onChange={set("studyYear")}>
              <option value="" disabled>{t("choose")}</option>
              {STUDY_YEARS.map((y) => (
                <option key={y} value={y}>{t("yearOption", { year: y })}</option>
              ))}
            </select>
          </Field>
        </div>
        {form.departmentId === OTHER && (
          <Field id="departmentText" label={t("departmentOther")}>
            <Input id="departmentText" required maxLength={200} value={form.departmentText} onChange={set("departmentText")} />
          </Field>
        )}
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-base font-semibold text-foreground">{t("consentHeading")}</legend>
        {notices.map((notice) => (
          <details key={notice.code} className="rounded-lg border border-border p-4 text-sm">
            <summary className="cursor-pointer font-medium text-foreground">
              {notice.title}
              {notice.draft && <span className="ml-2 text-xs font-normal text-muted-foreground">({t("draftTranslation")})</span>}
            </summary>
            <div className="mt-3 space-y-2 text-muted-foreground">
              {notice.paragraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </details>
        ))}
        <Check checked={ack} onChange={setAck} required>
          {notices.map((n) => n.acknowledge).join(" ")} <span className="text-destructive">*</span>
        </Check>
        <Check checked={dataUse} onChange={setDataUse}>
          {notices[0]?.dataUse}
        </Check>

        <div role="radiogroup" aria-labelledby="opportunities-q" className="space-y-2 rounded-lg border border-border p-4">
          <p id="opportunities-q" className="text-sm text-foreground">{t("opportunitiesQuestion")}</p>
          {(["yes", "no"] as const).map((v) => (
            <label key={v} className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
              <input
                type="radio"
                name="opportunities"
                required
                className="h-4 w-4 accent-primary"
                checked={opportunities === v}
                onChange={() => setOpportunities(v)}
              />
              {t(v === "yes" ? "opportunitiesYes" : "opportunitiesNo")}
            </label>
          ))}
        </div>

        <Check checked={psychShare} onChange={setPsychShare}>
          {t("psychShare")}
        </Check>
      </fieldset>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? t("submitting") : t("submit")}
      </Button>
    </form>
  );
}

function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Check({
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
    <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm text-foreground">
      <input
        type="checkbox"
        required={required}
        className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{children}</span>
    </label>
  );
}
