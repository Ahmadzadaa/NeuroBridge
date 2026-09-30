"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useApiErrorMessage } from "@/lib/api/api-error";
import { motion, useReducedMotion } from "framer-motion";
import {
  Award,
  Camera,
  CalendarDays,
  CheckCircle2,
  ChevronsUpDown,
  FileText,
  GraduationCap,
  KeyRound,
  Loader2,
  Lock,
  Save,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { IconTile, InsetGroup, Reveal } from "@/components/ui/ios";
import { cn } from "@/lib/utils";

interface ProfileData {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  language: string;
  coinBalance: number;
  memberSince: string;
  badges: number;
  certificates: number;
  examsPassed: number;
  teacherName: string | null;
  university: string;
  faculty: string;
  specialty: string;
  studyYear: number | null;
  avatarUrl: string | null;
}

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const STUDY_YEARS = [1, 2, 3, 4, 5, 6];
const EASE = [0.32, 0.72, 0, 1] as const;

interface ProfileClientProps {
  locale: string;
  profile: ProfileData;
}

const LANGUAGES = [
  { value: "az", label: "Azərbaycan" },
  { value: "tr", label: "Türkçe" },
  { value: "en", label: "English" },
];

const STRENGTH = ["weak", "fair", "good", "strong"] as const;
const STRENGTH_COLORS = ["bg-destructive", "bg-amber-500", "bg-sky-500", "bg-success"];

export function ProfileClient({ locale, profile }: ProfileClientProps) {
  const t = useTranslations("participant.profilePage");
  const apiError = useApiErrorMessage();
  const tc = useTranslations("common");
  const router = useRouter();
  const reducedMotion = useReducedMotion();

  const [firstName, setFirstName] = useState(profile.firstName);
  const [lastName, setLastName] = useState(profile.lastName);
  const [phone, setPhone] = useState(profile.phone);
  const [language, setLanguage] = useState(profile.language);
  const [savingProfile, setSavingProfile] = useState(false);

  const [university, setUniversity] = useState(profile.university);
  const [faculty, setFaculty] = useState(profile.faculty);
  const [specialty, setSpecialty] = useState(profile.specialty);
  const [studyYear, setStudyYear] = useState(
    profile.studyYear ? String(profile.studyYear) : ""
  );

  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const fullName =
    [firstName, lastName].filter(Boolean).join(" ") || profile.email;
  const initials = fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const passwordRules = [
    newPassword.length >= 8,
    /[a-z]/.test(newPassword),
    /[A-Z]/.test(newPassword),
    /\d/.test(newPassword),
  ];
  const passwordScore = passwordRules.filter(Boolean).length;
  const passwordPolicyOk = passwordScore === passwordRules.length;
  const passwordsMatch = newPassword === confirmPassword;

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (savingProfile) return;
    setSavingProfile(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          phone,
          language,
          university,
          faculty,
          specialty,
          studyYear: studyYear ? Number(studyYear) : null,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success(t("profileSaved"));
      if (language !== locale) {
        // Language switch takes effect via the locale segment.
        window.location.href = `/${language}/participant/profile`;
        return;
      }
      router.refresh();
    } catch {
      toast.error(tc("error"));
    } finally {
      setSavingProfile(false);
    }
  }

  async function uploadAvatar(file: File) {
    // Check locally first so an oversized or wrong-typed file never travels.
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      toast.error(t("photoInvalid"));
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      toast.error(t("photoTooLarge"));
      return;
    }

    setUploadingAvatar(true);
    try {
      const body = new FormData();
      body.append("avatar", file);
      const res = await fetch("/api/profile/avatar", { method: "POST", body });
      const data = (await res.json().catch(() => null)) as {
        avatarUrl?: string;
        error?: string;
      } | null;

      if (!res.ok) {
        toast.error(apiError(data));
        return;
      }

      // The query string busts the cached image after a replacement.
      setAvatarUrl(data?.avatarUrl ?? null);
      toast.success(t("photoUpdated"));
      router.refresh();
    } catch {
      toast.error(tc("error"));
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function removeAvatar() {
    setUploadingAvatar(true);
    try {
      const res = await fetch("/api/profile/avatar", { method: "DELETE" });
      if (!res.ok) throw new Error();
      setAvatarUrl(null);
      toast.success(t("photoRemoved"));
      router.refresh();
    } catch {
      toast.error(tc("error"));
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (savingPassword || !passwordPolicyOk || !passwordsMatch) return;
    setSavingPassword(true);
    try {
      const res = await fetch("/api/profile/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (res.status === 400) {
        const data = await res.json().catch(() => null);
        toast.error(apiError(data));
        return;
      }
      if (!res.ok) throw new Error();
      toast.success(t("passwordChanged"));
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      toast.error(tc("error"));
    } finally {
      setSavingPassword(false);
    }
  }

  const stats = [
    { icon: Award, tone: "amber" as const, label: t("stats.badges"), value: profile.badges },
    { icon: FileText, tone: "sky" as const, label: t("stats.certificates"), value: profile.certificates },
    { icon: CheckCircle2, tone: "emerald" as const, label: t("stats.examsPassed"), value: profile.examsPassed },
  ];

  return (
    <DashboardLayout
      panel="participant"
      title={t("title")}
      userName={fullName}
      coinBalance={profile.coinBalance}
    >
      <div className="mx-auto max-w-2xl space-y-8">
        {/* ── Identity: centred like an Apple ID header ─────────── */}
        <Reveal className="flex flex-col items-center pt-2 text-center">
          <div className="relative">
            <Avatar className="h-24 w-24 text-2xl shadow-[0_12px_30px_-12px_rgba(79,70,229,0.55)] ring-4 ring-card">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={fullName} />}
              <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-violet-600 font-semibold text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_IMAGE_TYPES.join(",")}
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadAvatar(file);
              }}
            />
            <button
              type="button"
              disabled={uploadingAvatar}
              onClick={() => fileInputRef.current?.click()}
              aria-label={avatarUrl ? t("changePhoto") : t("uploadPhoto")}
              className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md ring-4 ring-background transition active:scale-90 disabled:opacity-60"
            >
              {uploadingAvatar ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Camera className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>

          <h2 className="mt-4 text-[26px] font-bold tracking-[-0.6px] text-foreground">{fullName}</h2>
          <p className="text-[15px] text-muted-foreground">{profile.email}</p>

          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1 text-[12px] text-muted-foreground shadow-sm ring-1 ring-border/60">
              <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
              {t("memberSince", {
                date: new Date(profile.memberSince).toLocaleDateString(locale),
              })}
            </span>
            {profile.teacherName && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[12px] font-medium text-primary">
                <GraduationCap className="h-3.5 w-3.5" aria-hidden="true" />
                {t("myTeacher", { name: profile.teacherName })}
              </span>
            )}
            {avatarUrl && !uploadingAvatar && (
              <button
                type="button"
                onClick={removeAvatar}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                {t("removePhoto")}
              </button>
            )}
          </div>
        </Reveal>

        <Reveal index={1} className="grid grid-cols-3 gap-3">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col items-center rounded-[20px] bg-card px-2 py-4 text-center shadow-sm ring-1 ring-border/60"
            >
              <IconTile icon={stat.icon} tone={stat.tone} size="sm" />
              <p className="mt-2 text-[22px] font-bold tabular-nums tracking-[-0.5px] text-foreground">{stat.value}</p>
              <p className="text-[12px] leading-tight text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </Reveal>

        {/* ── Personal + academic: Settings-style rows ───────────── */}
        <Reveal index={2}>
          <form onSubmit={saveProfile} className="space-y-6">
            <InsetGroup header={t("personalInfo")} footer={t("emailLocked")}>
              <FormRow label={t("firstName")} htmlFor="firstName">
                <RowInput id="firstName" required maxLength={100} autoComplete="given-name" value={firstName} onChange={setFirstName} />
              </FormRow>
              <FormRow label={t("lastName")} htmlFor="lastName">
                <RowInput id="lastName" required maxLength={100} autoComplete="family-name" value={lastName} onChange={setLastName} />
              </FormRow>
              <FormRow label={t("phone")} htmlFor="phone">
                <RowInput id="phone" type="tel" maxLength={30} autoComplete="tel" placeholder="+994 50 000 00 00" value={phone} onChange={setPhone} />
              </FormRow>
              <FormRow label={t("email")} htmlFor="email">
                <span id="email" className="flex min-w-0 flex-1 items-center justify-end gap-1.5 truncate text-[15px] text-muted-foreground">
                  <span className="truncate">{profile.email}</span>
                  <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                </span>
              </FormRow>
              <div className="px-4 py-3">
                <p id="language-label" className="mb-2 text-[15px] text-foreground">{t("language")}</p>
                <Segmented
                  labelledBy="language-label"
                  value={language}
                  options={LANGUAGES}
                  onChange={setLanguage}
                  layoutId={reducedMotion ? undefined : "profile-language"}
                />
              </div>
            </InsetGroup>

            <InsetGroup header={t("academicInfo")} footer={t("academicHint")}>
              <FormRow label={t("university")} htmlFor="university">
                <RowInput id="university" maxLength={200} value={university} onChange={setUniversity} />
              </FormRow>
              <FormRow label={t("faculty")} htmlFor="faculty">
                <RowInput id="faculty" maxLength={200} value={faculty} onChange={setFaculty} />
              </FormRow>
              <FormRow label={t("specialty")} htmlFor="specialty">
                <RowInput id="specialty" maxLength={200} value={specialty} onChange={setSpecialty} />
              </FormRow>
              <FormRow label={t("studyYear")} htmlFor="studyYear">
                <span className="relative flex min-w-0 flex-1 justify-end">
                  <select
                    id="studyYear"
                    value={studyYear}
                    onChange={(e) => setStudyYear(e.target.value)}
                    className="h-11 appearance-none bg-transparent pr-6 text-right text-[15px] text-muted-foreground outline-none"
                  >
                    <option value="">{t("notSet")}</option>
                    {STUDY_YEARS.map((year) => (
                      <option key={year} value={String(year)}>
                        {t("studyYearUnit", { year })}
                      </option>
                    ))}
                  </select>
                  <ChevronsUpDown className="pointer-events-none absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" aria-hidden="true" />
                </span>
              </FormRow>
            </InsetGroup>

            <div className="flex justify-end px-1">
              <Button type="submit" size="lg" disabled={savingProfile || !firstName.trim() || !lastName.trim()}>
                {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}
                {tc("save")}
              </Button>
            </div>
          </form>
        </Reveal>

        {/* ── Password ───────────────────────────────────────────── */}
        <Reveal index={3}>
          <form onSubmit={changePassword} className="space-y-4">
            <InsetGroup header={t("security")} footer={t("securityHint")}>
              <FormRow label={t("currentPassword")} htmlFor="currentPassword">
                <RowInput id="currentPassword" type="password" autoComplete="current-password" value={currentPassword} onChange={setCurrentPassword} />
              </FormRow>
              <FormRow label={t("newPassword")} htmlFor="newPassword">
                <RowInput id="newPassword" type="password" autoComplete="new-password" value={newPassword} onChange={setNewPassword} />
              </FormRow>
              <FormRow label={t("confirmPassword")} htmlFor="confirmPassword">
                <RowInput id="confirmPassword" type="password" autoComplete="new-password" value={confirmPassword} onChange={setConfirmPassword} />
              </FormRow>
              {newPassword.length > 0 && (
                <div className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="grid flex-1 grid-cols-4 gap-1.5" aria-hidden="true">
                      {STRENGTH.map((key, i) => (
                        <div key={key} className="h-1.5 overflow-hidden rounded-full bg-muted">
                          <motion.div
                            className={cn("h-full rounded-full", STRENGTH_COLORS[passwordScore - 1] ?? "bg-muted")}
                            initial={false}
                            animate={{ width: i < passwordScore ? "100%" : "0%" }}
                            transition={{ duration: reducedMotion ? 0 : 0.35, ease: EASE }}
                          />
                        </div>
                      ))}
                    </div>
                    <span className="w-14 text-right text-[12px] font-semibold text-muted-foreground" aria-live="polite">
                      {t(`strength.${STRENGTH[Math.max(passwordScore, 1) - 1]}`)}
                    </span>
                  </div>
                  {!passwordPolicyOk && <p className="mt-2 text-[12px] text-muted-foreground">{t("passwordPolicy")}</p>}
                  {confirmPassword.length > 0 && !passwordsMatch && (
                    <p className="mt-2 text-[12px] text-destructive">{t("passwordMismatch")}</p>
                  )}
                </div>
              )}
            </InsetGroup>

            <div className="flex justify-end px-1">
              <Button
                type="submit"
                variant="outline"
                size="lg"
                disabled={savingPassword || !currentPassword || !passwordPolicyOk || !passwordsMatch}
              >
                {savingPassword ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <KeyRound className="h-4 w-4" aria-hidden="true" />}
                {t("changePassword")}
              </Button>
            </div>
          </form>
        </Reveal>
      </div>
    </DashboardLayout>
  );
}

/** Settings-style row: label on the left, the control fills the right. */
function FormRow({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-[52px] items-center gap-4 px-4 focus-within:bg-muted/40">
      <label htmlFor={htmlFor} className="w-32 shrink-0 text-[15px] text-foreground sm:w-40">
        {label}
      </label>
      {children}
    </div>
  );
}

function RowInput({
  onChange,
  ...props
}: Omit<React.ComponentProps<"input">, "onChange"> & { onChange: (value: string) => void }) {
  return (
    <input
      {...props}
      onChange={(e) => onChange(e.target.value)}
      className="h-11 min-w-0 flex-1 bg-transparent text-right text-[15px] text-foreground outline-none placeholder:text-muted-foreground/60"
    />
  );
}

function Segmented({
  value,
  options,
  onChange,
  labelledBy,
  layoutId,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  labelledBy: string;
  layoutId?: string;
}) {
  return (
    <div role="radiogroup" aria-labelledby={labelledBy} className="grid auto-cols-fr grid-flow-col gap-1 rounded-[12px] bg-muted p-1">
      {options.map((option) => {
        const on = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(option.value)}
            className="relative h-9 rounded-[9px] text-[13px] font-semibold outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {on && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 rounded-[9px] bg-card shadow-sm ring-1 ring-border/50"
                transition={{ type: "spring", stiffness: 500, damping: 38 }}
              />
            )}
            <span className={cn("relative", on ? "text-foreground" : "text-muted-foreground")}>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
