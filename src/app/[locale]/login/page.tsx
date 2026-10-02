"use client";

import { useState } from "react";
import { signIn, getSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Eye, EyeOff, Loader2, CheckCircle2 } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import type { UserRole } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const inputClassName = cn(
  "h-12 w-full rounded-xl border border-transparent bg-muted/60 px-4 text-[15px] text-foreground outline-none",
  "placeholder:text-muted-foreground/70 hover:bg-muted",
  "transition-[background-color,border-color,box-shadow] duration-200 ease-out",
  "focus:border-primary/40 focus:bg-card focus:ring-4 focus:ring-primary/15"
);

function FieldLabel({
  htmlFor,
  children,
}: {
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1.5 block px-1 text-[13px] font-medium text-foreground/80"
    >
      {children}
    </label>
  );
}

export default function LoginPage() {
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [totpCode, setTotpCode] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [show2FA, setShow2FA] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const appName = tc("appName");
  const show2FAFields = show2FA || Boolean(totpCode) || Boolean(recoveryCode);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    const result = await signIn("credentials", {
      email: email.trim(),
      password: password.trim(),
      totpCode: totpCode || undefined,
      recoveryCode: recoveryCode || undefined,
      redirect: false,
    });

    if (result?.error) {
      setLoading(false);
      const errorCode = String(
        (result as { code?: string }).code ?? result.error
      );

      if (errorCode === "two_factor_required") {
        setShow2FA(true);
        toast.error(t("twoFactorRequired"));
      } else if (errorCode === "account_locked") {
        setErrorMessage(t("accountLocked"));
      } else {
        setErrorMessage(t("invalidCredentials"));
      }
      return;
    }

    // Brief success flash before redirect
    setSuccess(true);

    const session = await getSession();
    const role = session?.user?.role as UserRole | undefined;

    if (session?.user?.requires2FASetup) {
      router.refresh();
      router.push("/settings/security");
      return;
    }

    const dashboardByRole: Record<UserRole, string> = {
      SUPER_ADMIN: "/super-admin",
      TENANT_ADMIN: "/tenant",
      TENANT_VIEWER: "/tenant",
      PARTICIPANT: "/participant",
      JURY: "/jury",
      TEACHER: "/teacher",
    };

    router.refresh();
    router.push(role ? dashboardByRole[role] : "/");
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4 py-16">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 -top-40 h-[440px] w-[440px] rounded-full bg-primary/15 blur-[110px]" />
        <div className="absolute -right-32 top-1/3 h-[380px] w-[380px] rounded-full bg-fuchsia-500/10 blur-[110px]" />
        <div className="absolute -bottom-40 left-1/4 h-[400px] w-[400px] rounded-full bg-sky-400/10 blur-[110px]" />
      </div>

      {/* Back to the public site (pricing, features) */}
      <Link
        href="/"
        className="fixed left-4 top-4 z-50 inline-flex h-10 items-center gap-1.5 rounded-full bg-card/70 px-3.5 text-[14px] font-medium text-foreground/80 ring-1 ring-border/60 backdrop-blur-xl transition-colors hover:bg-card hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {t("backToSite")}
      </Link>

      {/* Top bar — fixed, above everything */}
      <div className="fixed right-5 top-4 z-50 flex gap-2">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>

      {/* Card */}
      <div className="ios-reveal relative z-10 w-full max-w-[420px] rounded-[28px] bg-card/85 p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_30px_80px_-30px_rgba(15,23,42,0.35)] ring-1 ring-border/60 backdrop-blur-xl sm:p-10">
        {/* Logo block */}
        <div className="flex items-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-gradient-to-br from-indigo-500 to-violet-600 text-[18px] font-extrabold text-white shadow-[0_8px_20px_-8px_var(--primary)]">
            {appName.charAt(0)}
          </div>
          <span className="ml-2.5 text-[18px] font-bold text-foreground">
            {appName}
          </span>
        </div>

        {/* Divider — structured, dashboard-like header */}
        <div className="mt-8" aria-hidden="true" />

        {/* Heading */}
        <h1 className="text-[28px] font-bold leading-tight tracking-[-0.8px] text-foreground">
          {t("loginTitle")}
        </h1>
        <p className="mt-1.5 text-[15px] text-muted-foreground">
          {t("loginSubtitle")}
        </p>

        <form onSubmit={handleSubmit} className="mt-7" noValidate>
          {/* Email */}
          <div className="mb-4">
            <FieldLabel htmlFor="email">{t("email")}</FieldLabel>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setErrorMessage(null);
              }}
              required
              autoComplete="email"
              className={cn(
                inputClassName,
                errorMessage && "border-danger"
              )}
            />
          </div>

          {/* Password */}
          <div className="mb-6">
            <div className="flex items-baseline justify-between">
              <FieldLabel htmlFor="password">{t("password")}</FieldLabel>
              <Link href="/forgot-password" className="mb-1.5 px-1 text-[13px] font-medium text-primary hover:underline">
                {t("forgotPassword")}
              </Link>
            </div>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrorMessage(null);
                }}
                required
                autoComplete="current-password"
                className={cn(
                  inputClassName,
                  "pr-11",
                  errorMessage && "border-danger"
                )}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? t("hidePassword") : t("showPassword")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-tertiary transition-colors duration-150 hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>

            {/* Inline error — slides down with height animation */}
            <AnimatePresence initial={false}>
              {errorMessage && (
                <motion.p
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className="overflow-hidden pt-1.5 text-[12px] text-danger"
                  role="alert"
                >
                  {errorMessage}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* 2FA fields — existing slide-open behavior, unchanged */}
          <motion.div
            initial={false}
            animate={{
              height: show2FAFields ? "auto" : 0,
              opacity: show2FAFields ? 1 : 0,
            }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
            // Collapsed fields must not be reachable by Tab or screen readers.
            inert={!show2FAFields}
          >
            <div className="mb-4">
              <FieldLabel htmlFor="totpCode">{t("totpCode")}</FieldLabel>
              <input
                id="totpCode"
                type="text"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value)}
                autoComplete="one-time-code"
                placeholder="000000"
                className={inputClassName}
              />
            </div>
            <div className="mb-6">
              <FieldLabel htmlFor="recoveryCode">{t("recoveryCode")}</FieldLabel>
              <input
                id="recoveryCode"
                type="text"
                value={recoveryCode}
                onChange={(e) => setRecoveryCode(e.target.value)}
                className={inputClassName}
              />
            </div>
          </motion.div>

          {/* Submit */}
          <Button
            type="submit"
            className={cn(
              "h-12 w-full rounded-2xl text-[15px] font-semibold",
              loading && "opacity-85",
              success && "bg-success hover:bg-success"
            )}
            disabled={loading || success}
          >
            {loading && (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            )}
            {success && <CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
            {t("login")}
          </Button>

        </form>
      </div>

      {/* Footer */}
      <p className="relative z-10 mt-6 text-[11px] text-tertiary">
        © {new Date().getFullYear()} {appName} · {t("allRightsReserved")}
      </p>
    </div>
  );
}
