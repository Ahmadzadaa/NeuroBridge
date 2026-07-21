"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { motion, useReducedMotion } from "framer-motion";
import {
  Award,
  CalendarDays,
  CheckCircle2,
  FileText,
  GraduationCap,
  KeyRound,
  Loader2,
  Save,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
}

interface ProfileClientProps {
  locale: string;
  profile: ProfileData;
}

const LANGUAGES = [
  { value: "az", label: "Azərbaycan dili" },
  { value: "tr", label: "Türkçe" },
  { value: "en", label: "English" },
];

export function ProfileClient({ locale, profile }: ProfileClientProps) {
  const t = useTranslations("participant.profilePage");
  const tc = useTranslations("common");
  const router = useRouter();
  const reducedMotion = useReducedMotion();

  const [firstName, setFirstName] = useState(profile.firstName);
  const [lastName, setLastName] = useState(profile.lastName);
  const [phone, setPhone] = useState(profile.phone);
  const [language, setLanguage] = useState(profile.language);
  const [savingProfile, setSavingProfile] = useState(false);

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

  const passwordPolicyOk =
    newPassword.length >= 8 &&
    /[a-z]/.test(newPassword) &&
    /[A-Z]/.test(newPassword) &&
    /\d/.test(newPassword);
  const passwordsMatch = newPassword === confirmPassword;

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (savingProfile) return;
    setSavingProfile(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, phone, language }),
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
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        toast.error(
          data?.error?.includes("incorrect")
            ? t("wrongCurrentPassword")
            : data?.error ?? tc("error")
        );
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
    { icon: Award, label: t("stats.badges"), value: profile.badges },
    { icon: FileText, label: t("stats.certificates"), value: profile.certificates },
    { icon: CheckCircle2, label: t("stats.examsPassed"), value: profile.examsPassed },
  ];

  return (
    <DashboardLayout
      panel="participant"
      title={t("title")}
      userName={fullName}
      coinBalance={profile.coinBalance}
    >
      <div className="mx-auto max-w-3xl space-y-6">
        {/* ── Identity card ──────────────────────────────────── */}
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0, 0, 0.2, 1] }}
          className="rounded-2xl bg-gradient-to-br from-primary/10 via-card to-card p-6 shadow-sm ring-1 ring-primary/10 sm:p-8"
        >
          <div className="flex flex-wrap items-center gap-5">
            <Avatar className="h-16 w-16 text-lg ring-2 ring-primary/30">
              <AvatarFallback className="bg-primary/10 font-semibold text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <h2 className="text-[19px] font-bold leading-snug">{fullName}</h2>
              <p className="mt-0.5 text-[13px] text-muted-foreground">
                {profile.email}
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-[12px] text-muted-foreground">
                <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                {t("memberSince", {
                  date: new Date(profile.memberSince).toLocaleDateString(locale),
                })}
              </p>
              {profile.teacherName && (
                <p className="mt-1 flex items-center gap-1.5 text-[12px] font-medium text-primary">
                  <GraduationCap className="h-3.5 w-3.5" aria-hidden="true" />
                  {t("myTeacher", { name: profile.teacherName })}
                </p>
              )}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-3">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl bg-card/80 p-3.5 text-center shadow-sm ring-1 ring-border/60"
              >
                <stat.icon
                  className="mx-auto h-4.5 w-4.5 text-primary"
                  aria-hidden="true"
                />
                <p className="mt-1.5 text-[18px] font-bold tabular-nums">
                  {stat.value}
                </p>
                <p className="text-[11px] text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ── Personal info ──────────────────────────────────── */}
        <motion.form
          onSubmit={saveProfile}
          initial={reducedMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.35, ease: [0, 0, 0.2, 1] }}
          className="rounded-2xl bg-card p-6 shadow-sm sm:p-8"
        >
          <h3 className="text-[15px] font-semibold">{t("personalInfo")}</h3>
          <p className="mt-1 text-[12px] text-muted-foreground">
            {t("personalInfoHint")}
          </p>

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="firstName">{t("firstName")}</Label>
              <Input
                id="firstName"
                required
                maxLength={100}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName">{t("lastName")}</Label>
              <Input
                id="lastName"
                required
                maxLength={100}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">{t("phone")}</Label>
              <Input
                id="phone"
                type="tel"
                maxLength={30}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+994 50 000 00 00"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="language">{t("language")}</Label>
              <Select value={language} onValueChange={(v) => v && setLanguage(v)}>
                <SelectTrigger id="language" className="w-full rounded-xl">
                  <SelectValue>
                    {LANGUAGES.find((l) => l.value === language)?.label}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((lang) => (
                    <SelectItem key={lang.value} value={lang.value}>
                      {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="email">{t("email")}</Label>
              <Input
                id="email"
                value={profile.email}
                readOnly
                className="rounded-xl bg-subtle text-muted-foreground"
              />
              <p className="text-[11px] text-muted-foreground">
                {t("emailLocked")}
              </p>
            </div>
          </div>

          <Button
            type="submit"
            disabled={savingProfile || !firstName.trim() || !lastName.trim()}
            className="mt-6 rounded-xl"
          >
            {savingProfile ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <>
                <Save className="h-4 w-4" aria-hidden="true" />
                {tc("save")}
              </>
            )}
          </Button>
        </motion.form>

        {/* ── Password ───────────────────────────────────────── */}
        <motion.form
          onSubmit={changePassword}
          initial={reducedMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16, duration: 0.35, ease: [0, 0, 0.2, 1] }}
          className="rounded-2xl bg-card p-6 shadow-sm sm:p-8"
        >
          <h3 className="flex items-center gap-2 text-[15px] font-semibold">
            <ShieldCheck className="h-4.5 w-4.5 text-primary" aria-hidden="true" />
            {t("security")}
          </h3>
          <p className="mt-1 text-[12px] text-muted-foreground">
            {t("securityHint")}
          </p>

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="currentPassword">{t("currentPassword")}</Label>
              <Input
                id="currentPassword"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="rounded-xl sm:max-w-[calc(50%-0.5rem)]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="newPassword">{t("newPassword")}</Label>
              <Input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="rounded-xl"
              />
              {newPassword.length > 0 && !passwordPolicyOk && (
                <p className="text-[11px] text-warning-dark">
                  {t("passwordPolicy")}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">{t("confirmPassword")}</Label>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="rounded-xl"
              />
              {confirmPassword.length > 0 && !passwordsMatch && (
                <p className="text-[11px] text-destructive">
                  {t("passwordMismatch")}
                </p>
              )}
            </div>
          </div>

          <Button
            type="submit"
            variant="outline"
            disabled={
              savingPassword ||
              !currentPassword ||
              !passwordPolicyOk ||
              !passwordsMatch
            }
            className="mt-6 rounded-xl"
          >
            {savingPassword ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <>
                <KeyRound className="h-4 w-4" aria-hidden="true" />
                {t("changePassword")}
              </>
            )}
          </Button>
        </motion.form>
      </div>
    </DashboardLayout>
  );
}
