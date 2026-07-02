"use client";

import { useId, useState } from "react";
import { signIn, getSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { motion, useReducedMotion } from "framer-motion";
import {
  Gamepad2,
  LineChart,
  Sparkles,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import type { UserRole } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/** Input with floating label: label rests inside the field and moves up on focus/fill. */
function FloatingInput({
  label,
  type = "text",
  value,
  onChange,
  required,
  autoComplete,
  trailing,
  error,
  ...props
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  autoComplete?: string;
  trailing?: React.ReactNode;
  error?: boolean;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value">) {
  const id = useId();
  const floated = value.length > 0;

  return (
    <div className="relative">
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        autoComplete={autoComplete}
        placeholder=" "
        className={cn(
          "peer h-13 w-full rounded-xl border bg-card px-3.5 pt-5 pb-1.5 text-[15px] text-foreground outline-none",
          "transition-[border-color,box-shadow] duration-150 ease-[cubic-bezier(0.4,0,0.2,1)]",
          "focus:border-primary focus:shadow-glow",
          error ? "border-danger shadow-[0_0_0_3px_rgba(239,68,68,0.12)]" : "border-input",
          trailing && "pr-11"
        )}
        {...props}
      />
      <label
        htmlFor={id}
        className={cn(
          "pointer-events-none absolute left-3.5 text-muted-foreground",
          "transition-all duration-150 ease-[cubic-bezier(0.4,0,0.2,1)]",
          floated
            ? "top-1.5 text-[11px] font-medium"
            : "top-1/2 -translate-y-1/2 text-[14px]",
          "peer-focus:top-1.5 peer-focus:translate-y-0 peer-focus:text-[11px] peer-focus:font-medium peer-focus:text-primary"
        )}
      >
        {label}
      </label>
      {trailing && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2">{trailing}</div>
      )}
    </div>
  );
}

export default function LoginPage() {
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [totpCode, setTotpCode] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [show2FA, setShow2FA] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [hasError, setHasError] = useState(false);

  const features = [
    { icon: Gamepad2, label: t("featureSimulations") },
    { icon: LineChart, label: t("featureTracking") },
    { icon: Sparkles, label: t("featureAI") },
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setHasError(false);

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
        setHasError(true);
        toast.error(t("accountLocked"));
      } else {
        setHasError(true);
        toast.error(t("invalidCredentials"));
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
    };

    router.refresh();
    router.push(role ? dashboardByRole[role] : "/");
  }

  return (
    <div className="flex min-h-screen">
      {/* ── Brand panel (left, 55%) ─────────────────────────────── */}
      <div
        className="relative hidden overflow-hidden lg:flex lg:w-[55%] lg:flex-col lg:items-center lg:justify-center"
        style={{
          background:
            "linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4338ca 100%)",
        }}
      >
        <div className="mesh-gradient absolute inset-0" aria-hidden="true" />

        <div className="relative z-10 flex flex-col items-center px-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-2xl font-bold text-white shadow-brand backdrop-blur-sm">
            B
          </div>
          <p className="mt-4 text-[28px] font-bold tracking-[-0.5px] text-white">
            {tc("appName")}
          </p>
          <p className="mt-1 text-[14px] text-white/60">{tc("appDescription")}</p>

          <ul className="mt-12 space-y-4 text-left">
            {features.map((feature, i) => (
              <motion.li
                key={feature.label}
                initial={reducedMotion ? false : { opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.15, duration: 0.4, ease: [0, 0, 0.2, 1] }}
                className="flex items-center gap-3 text-[15px] font-medium text-white/90"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm">
                  <feature.icon className="h-[18px] w-[18px] text-white" aria-hidden="true" />
                </span>
                {feature.label}
              </motion.li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── Form panel (right, 45%) ─────────────────────────────── */}
      <div className="relative flex flex-1 flex-col bg-card">
        {/* Subtle brand element behind the form on mobile */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-accent to-transparent lg:hidden"
          aria-hidden="true"
        />

        <div className="relative z-10 flex justify-end gap-2 p-4">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>

        <div className="relative z-10 flex flex-1 items-center justify-center px-6 pb-16 sm:px-12">
          <div className="w-full max-w-sm">
            <div className="mb-8 lg:hidden">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-xl font-bold text-primary-foreground shadow-brand">
                B
              </div>
            </div>

            <h1 className="text-[28px] font-semibold tracking-[-0.5px] text-foreground">
              {t("loginTitle")}
            </h1>
            <p className="mt-1.5 text-[13px] text-tertiary">{t("loginSubtitle")}</p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-4" noValidate>
              <FloatingInput
                label={t("email")}
                type="email"
                value={email}
                onChange={(v) => {
                  setEmail(v);
                  setHasError(false);
                }}
                required
                autoComplete="email"
                error={hasError}
              />
              <FloatingInput
                label={t("password")}
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(v) => {
                  setPassword(v);
                  setHasError(false);
                }}
                required
                autoComplete="current-password"
                error={hasError}
                trailing={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? t("hidePassword") : t("showPassword")}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                }
              />

              {/* 2FA fields slide open via height animation, not display toggle */}
              <motion.div
                initial={false}
                animate={{
                  height: show2FA || totpCode || recoveryCode ? "auto" : 0,
                  opacity: show2FA || totpCode || recoveryCode ? 1 : 0,
                }}
                transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                className="space-y-4 overflow-hidden"
              >
                <FloatingInput
                  label={t("totpCode")}
                  type="text"
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  value={totpCode}
                  onChange={setTotpCode}
                  autoComplete="one-time-code"
                />
                <FloatingInput
                  label={t("recoveryCode")}
                  type="text"
                  value={recoveryCode}
                  onChange={setRecoveryCode}
                />
              </motion.div>

              <Button
                type="submit"
                size="lg"
                className={cn(
                  "h-12 w-full rounded-xl text-[15px]",
                  success && "bg-success hover:bg-success"
                )}
                disabled={loading || success}
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {success && <CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
                {t("login")}
              </Button>

              {process.env.NODE_ENV === "development" && (
                <div className="rounded-xl border border-dashed border-border bg-subtle p-3 text-xs text-muted-foreground">
                  <p className="font-medium text-foreground">Demo hesablar</p>
                  <p>participant@demo.com</p>
                  <p>tenant@demo-tekno.com</p>
                  <p>admin@bizsim.com</p>
                  <p className="mt-1 font-mono">Şifrə: Admin123!</p>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
