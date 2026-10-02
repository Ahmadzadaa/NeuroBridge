"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { signOut } from "next-auth/react";
import { LogOut, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CoinDisplay } from "@/components/ui/coin-display";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Label } from "@/components/ui/typography";
import { LanguageSwitcher } from "./language-switcher";
import { ThemeToggle } from "./theme-toggle";
import { SidebarNav } from "./sidebar-nav";
import { MobileNav } from "./mobile-nav";
import { NotificationBell } from "./notification-bell";
import { PageTransition } from "./page-transition";
import { cn } from "@/lib/utils";
import { Link } from "@/i18n/navigation";

type PanelType = "super-admin" | "tenant" | "participant" | "jury" | "teacher";

interface DashboardLayoutProps {
  panel: PanelType;
  title: string;
  userName?: string;
  /** Participant coin balance — shows the coin chip in the topbar */
  coinBalance?: number;
  /** Tenant seat usage — shows the seat counter widget in the sidebar */
  seatUsage?: { used: number; limit: number };
  children: React.ReactNode;
}

const roleKeyByPanel: Record<PanelType, string> = {
  "super-admin": "superAdmin",
  tenant: "tenant",
  participant: "participant",
  jury: "jury",
  teacher: "teacher",
};

export function DashboardLayout({
  panel,
  title,
  userName = "User",
  coinBalance,
  seatUsage,
  children,
}: DashboardLayoutProps) {
  const t = useTranslations("common");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const seatPercent =
    seatUsage && seatUsage.limit > 0
      ? (seatUsage.used / seatUsage.limit) * 100
      : 0;

  return (
    <div className="min-h-screen bg-background">
      {/* ── Desktop sidebar ─────────────────────────────────────── */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 hidden h-full flex-col border-r border-sidebar-border/70 bg-sidebar/85 backdrop-blur-xl",
          "transition-[width] duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] lg:flex",
          sidebarOpen ? "w-60" : "w-16"
        )}
      >
        {/* Logo */}
        <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-sidebar-border px-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground shadow-brand">
            B
          </div>
          {sidebarOpen && (
            <span className="truncate text-lg font-semibold tracking-tight text-sidebar-foreground">
              {t("appName")}
            </span>
          )}
        </div>

        {/* User block */}
        <div
          className={cn(
            "flex items-center gap-2.5 border-b border-sidebar-border px-4 py-3",
            !sidebarOpen && "justify-center px-2"
          )}
        >
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          {sidebarOpen && (
            <div className="min-w-0">
              <p className="truncate text-[13px] font-medium text-sidebar-foreground">
                {userName}
              </p>
              <span className="inline-flex rounded-full bg-accent px-1.5 py-px text-[10px] font-semibold uppercase tracking-[0.5px] text-accent-foreground">
                {t(`roles.${roleKeyByPanel[panel]}`)}
              </span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto">
          {sidebarOpen && (
            <Label className="block px-6 pt-4 text-sidebar-foreground/50">
              {t("navigation")}
            </Label>
          )}
          <SidebarNav panel={panel} collapsed={!sidebarOpen} />
        </div>

        {/* Seat counter widget */}
        {seatUsage && sidebarOpen && (
          <div className="mx-3 mb-2 rounded-xl border border-sidebar-border bg-subtle/60 p-3">
            <div className="flex items-center justify-between">
              <Label className="text-sidebar-foreground/60">{t("seats")}</Label>
              <span className="text-[12px] font-semibold text-sidebar-foreground">
                {seatUsage.used} / {seatUsage.limit}
              </span>
            </div>
            <ProgressBar
              value={seatPercent}
              color="inverse"
              className="mt-2"
              aria-label={`${seatUsage.used} / ${seatUsage.limit} ${t("seats")}`}
            />
          </div>
        )}

        {/* Bottom actions */}
        <div className="border-t border-sidebar-border p-3">
          <button
            type="button"
            onClick={() => signOut()}
            className={cn(
              "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground",
              "transition-colors duration-150 hover:bg-subtle hover:text-foreground",
              "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              !sidebarOpen && "justify-center px-2"
            )}
          >
            <LogOut className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
            {sidebarOpen && <span>{t("logout")}</span>}
          </button>
        </div>

        {/* Collapse toggle on the sidebar edge */}
        <button
          type="button"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label={sidebarOpen ? t("collapseSidebar") : t("expandSidebar")}
          className={cn(
            "absolute -right-3 top-20 z-50 flex h-6 w-6 items-center justify-center rounded-full",
            "border border-border bg-card text-muted-foreground shadow-sm",
            "transition-colors duration-150 hover:text-foreground",
            "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          )}
        >
          {sidebarOpen ? (
            <ChevronLeft className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
        </button>
      </aside>

      {/* ── Main column ─────────────────────────────────────────── */}
      <div
        className={cn(
          "flex min-h-screen min-w-0 flex-col transition-[margin] duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)]",
          sidebarOpen ? "lg:ml-60" : "lg:ml-16"
        )}
      >
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/60 bg-background/70 px-4 backdrop-blur-2xl backdrop-saturate-150 lg:px-6">
          <h1 className="truncate text-[17px] font-semibold tracking-[-0.4px] text-foreground">
            {title}
          </h1>

          <div className="flex items-center gap-2">
            {typeof coinBalance === "number" && (
              <CoinDisplay balance={coinBalance} />
            )}
            <NotificationBell />
            <LanguageSwitcher />
            <ThemeToggle />
            <Link
              href={panel === "participant" ? "/participant/profile" : "/settings/security"}
              aria-label={t("account")}
              className="flex items-center gap-2 rounded-full py-1 pl-1 pr-1 transition-colors hover:bg-muted sm:pr-3"
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="hidden text-sm font-medium sm:inline">{userName}</span>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-xl lg:hidden"
              onClick={() => signOut()}
              aria-label={t("logout")}
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </header>

        {/* Page content — capped at 1400px so ultra-wide screens stay composed */}
        <main className="min-w-0 flex-1 p-4 pb-28 sm:p-6 lg:p-8 lg:pb-8">
          <div className="mx-auto w-full min-w-0 max-w-[1400px]">
            <PageTransition>{children}</PageTransition>
          </div>
        </main>
      </div>

      {/* ── Mobile bottom tab bar ───────────────────────────────── */}
      <MobileNav panel={panel} />
    </div>
  );
}
