"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { motion, useReducedMotion } from "framer-motion";
import { CheckCircle2, GraduationCap, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface JoinClientProps {
  locale: string;
  token: string;
  teacherName: string;
  organizationName: string;
}

export function JoinClient({
  locale,
  token,
  teacherName,
  organizationName,
}: JoinClientProps) {
  const t = useTranslations("teacher.join");
  const tc = useTranslations("common");
  const reducedMotion = useReducedMotion();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    university: "",
    faculty: "",
    specialty: "",
    studyYear: "",
  });
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const passwordOk =
    form.password.length >= 8 &&
    /[a-z]/.test(form.password) &&
    /[A-Z]/.test(form.password) &&
    /\d/.test(form.password);
  const valid =
    form.firstName.trim() &&
    form.lastName.trim() &&
    form.email.includes("@") &&
    passwordOk &&
    form.university.trim() &&
    form.faculty.trim() &&
    form.specialty.trim() &&
    form.studyYear;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || saving) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/join/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          email: form.email.trim().toLowerCase(),
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          university: form.university.trim(),
          faculty: form.faculty.trim(),
          specialty: form.specialty.trim(),
          studyYear: Number(form.studyYear),
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!res.ok) {
        toast.error(data?.error ?? tc("error"));
        return;
      }
      setDone(true);
    } catch {
      toast.error(tc("error"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <motion.div
        initial={reducedMotion ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0, 0, 0.2, 1] }}
        className="w-full max-w-[440px] rounded-2xl border border-border bg-card p-8 shadow-md"
      >
        {done ? (
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/10 text-success">
              <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
            </div>
            <h1 className="mt-4 text-[20px] font-bold">{t("doneTitle")}</h1>
            <p className="mt-2 text-[14px] text-muted-foreground">
              {t("doneText", { teacher: teacherName })}
            </p>
            <Button
              className="mt-6 w-full rounded-xl"
              render={<Link href={`/${locale}/login`} />}
            >
              {t("goToLogin")}
            </Button>
          </div>
        ) : (
          <>
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <GraduationCap className="h-7 w-7" aria-hidden="true" />
              </div>
              <h1 className="mt-4 text-[20px] font-bold">{t("title")}</h1>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                {t("subtitle", {
                  teacher: teacherName,
                  organization: organizationName,
                })}
              </p>
            </div>

            <form onSubmit={submit} className="mt-7 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="join-first">{t("firstName")}</Label>
                  <Input
                    id="join-first"
                    required
                    maxLength={100}
                    value={form.firstName}
                    onChange={(e) =>
                      setForm({ ...form, firstName: e.target.value })
                    }
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="join-last">{t("lastName")}</Label>
                  <Input
                    id="join-last"
                    required
                    maxLength={100}
                    value={form.lastName}
                    onChange={(e) =>
                      setForm({ ...form, lastName: e.target.value })
                    }
                    className="rounded-xl"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="join-email">{t("email")}</Label>
                <Input
                  id="join-email"
                  type="email"
                  required
                  maxLength={255}
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="join-password">{t("password")}</Label>
                <Input
                  id="join-password"
                  type="password"
                  required
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  className="rounded-xl"
                />
                {form.password.length > 0 && !passwordOk && (
                  <p className="text-[11px] text-warning-dark">
                    {t("passwordPolicy")}
                  </p>
                )}
              </div>

              <div className="border-t border-border pt-4">
                <p className="text-[13px] font-semibold">{t("academicTitle")}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {t("academicHint")}
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="join-university">{t("university")}</Label>
                <Input
                  id="join-university"
                  required
                  maxLength={200}
                  value={form.university}
                  onChange={(e) =>
                    setForm({ ...form, university: e.target.value })
                  }
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="join-faculty">{t("faculty")}</Label>
                <Input
                  id="join-faculty"
                  required
                  maxLength={200}
                  value={form.faculty}
                  onChange={(e) => setForm({ ...form, faculty: e.target.value })}
                  className="rounded-xl"
                />
              </div>
              <div className="grid grid-cols-[1fr_auto] gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="join-specialty">{t("specialty")}</Label>
                  <Input
                    id="join-specialty"
                    required
                    maxLength={200}
                    value={form.specialty}
                    onChange={(e) =>
                      setForm({ ...form, specialty: e.target.value })
                    }
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="join-year">{t("studyYear")}</Label>
                  <select
                    id="join-year"
                    required
                    value={form.studyYear}
                    onChange={(e) =>
                      setForm({ ...form, studyYear: e.target.value })
                    }
                    className="h-9 w-[110px] rounded-xl border border-input bg-transparent px-3 text-[14px] shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  >
                    <option value="" disabled>
                      —
                    </option>
                    {[1, 2, 3, 4, 5, 6].map((year) => (
                      <option key={year} value={year}>
                        {t("studyYearUnit", { year })}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <Button
                type="submit"
                disabled={!valid || saving}
                className="w-full rounded-xl"
                size="lg"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  t("register")
                )}
              </Button>
            </form>
          </>
        )}
      </motion.div>
    </div>
  );
}
