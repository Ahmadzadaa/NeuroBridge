"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { signOut } from "next-auth/react";
import { Menu, LogOut, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LanguageSwitcher } from "./language-switcher";
import { ThemeToggle } from "./theme-toggle";
import { SidebarNav } from "./sidebar-nav";
import { MobileNav } from "./mobile-nav";
import { cn } from "@/lib/utils";

type PanelType = "super-admin" | "tenant" | "participant";

interface DashboardLayoutProps {
  panel: PanelType;
  title: string;
  userName?: string;
  children: React.ReactNode;
}

export function DashboardLayout({
  panel,
  title,
  userName = "User",
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

  return (
    <div className="min-h-screen bg-[#F5F6FA] dark:bg-background">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 hidden h-full flex-col border-r border-border/50 bg-white/80 backdrop-blur-xl transition-all duration-300 dark:bg-card/80 lg:flex",
          sidebarOpen ? "w-64" : "w-[72px]"
        )}
      >
        <div className="flex h-16 items-center gap-2 border-b border-border/50 px-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-sm">
            B
          </div>
          {sidebarOpen && (
            <span className="font-semibold text-lg tracking-tight">BizSim</span>
          )}
        </div>
        <SidebarNav panel={panel} collapsed={!sidebarOpen} />
      </aside>

      {/* Main content */}
      <div
        className={cn(
          "flex min-h-screen flex-col transition-all duration-300",
          sidebarOpen ? "lg:ml-64" : "lg:ml-[72px]"
        )}
      >
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/50 bg-white/70 px-4 backdrop-blur-xl dark:bg-card/70 lg:px-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="hidden rounded-xl lg:flex"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="rounded-xl">
              <Bell className="h-5 w-5" />
            </Button>
            <LanguageSwitcher />
            <ThemeToggle />
            <div className="hidden items-center gap-2 sm:flex">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium">{userName}</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-xl"
              onClick={() => signOut()}
              title={t("logout")}
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 pb-20 lg:p-6 lg:pb-6">{children}</main>
      </div>

      {/* Mobile bottom nav */}
      <MobileNav panel={panel} />
    </div>
  );
}
