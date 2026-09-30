import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "./language-switcher";
import { ThemeToggle } from "./theme-toggle";

/**
 * Frame for the standalone public flows (registration, activation, joining):
 * soft ambient colour, a slim glass top bar and one centred sheet.
 */
export function AuthShell({ children, width = "md" }: { children: ReactNode; width?: "sm" | "md" | "lg" }) {
  const t = useTranslations("common");
  const max = { sm: "max-w-md", md: "max-w-xl", lg: "max-w-2xl" }[width];
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 -top-40 h-[420px] w-[420px] rounded-full bg-primary/15 blur-[110px]" />
        <div className="absolute -right-32 top-1/3 h-[360px] w-[360px] rounded-full bg-fuchsia-500/10 blur-[110px]" />
        <div className="absolute -bottom-40 left-1/4 h-[380px] w-[380px] rounded-full bg-sky-400/10 blur-[110px]" />
      </div>

      <header className="relative z-10 flex h-16 items-center justify-between px-4 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
          <span className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white shadow-[0_8px_20px_-8px_var(--primary)]">
            {t("appName").charAt(0)}
          </span>
          <span className="text-[17px] font-semibold tracking-[-0.3px] text-foreground">{t("appName")}</span>
        </Link>
        <div className="flex items-center gap-1">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </header>

      <main className={`relative z-10 mx-auto w-full ${max} px-4 pb-16 pt-4 sm:pt-10`}>{children}</main>
    </div>
  );
}

/** The frosted card the flows sit on. */
export function Sheet({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`ios-reveal rounded-[28px] bg-card/85 p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_30px_80px_-30px_rgba(15,23,42,0.35)] ring-1 ring-border/60 backdrop-blur-xl sm:p-8 ${className}`}
    >
      {children}
    </div>
  );
}
