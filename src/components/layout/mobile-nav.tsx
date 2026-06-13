"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FileText,
  Users,
  BarChart3,
  Settings,
  Gamepad2,
  GraduationCap,
  Award,
} from "lucide-react";

type PanelType = "super-admin" | "tenant" | "participant";

const mobileNavConfig: Record<PanelType, { href: string; labelKey: string; icon: React.ComponentType<{ className?: string }> }[]> = {
  "super-admin": [
    { href: "/super-admin", labelKey: "dashboard", icon: LayoutDashboard },
    { href: "/super-admin/tenants", labelKey: "tenants", icon: Users },
    { href: "/super-admin/billing", labelKey: "billing", icon: BarChart3 },
    { href: "/super-admin/support", labelKey: "support", icon: Settings },
  ],
  tenant: [
    { href: "/tenant", labelKey: "dashboard", icon: LayoutDashboard },
    { href: "/tenant/programs", labelKey: "programs", icon: FileText },
    { href: "/tenant/participants", labelKey: "participants", icon: Users },
    { href: "/tenant/reports", labelKey: "reports", icon: BarChart3 },
    { href: "/tenant/settings", labelKey: "settings", icon: Settings },
  ],
  participant: [
    { href: "/participant", labelKey: "dashboard", icon: LayoutDashboard },
    { href: "/participant/simulations", labelKey: "simulations", icon: Gamepad2 },
    { href: "/participant/trainings", labelKey: "trainings", icon: GraduationCap },
    { href: "/participant/badges", labelKey: "badges", icon: Award },
    { href: "/participant/profile", labelKey: "profile", icon: Settings },
  ],
};

interface MobileNavProps {
  panel: PanelType;
}

export function MobileNav({ panel }: MobileNavProps) {
  const t = useTranslations(`nav.${panel === "super-admin" ? "superAdmin" : panel}`);
  const pathname = usePathname();
  const items = mobileNavConfig[panel];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-border/50 bg-white/90 px-2 py-2 backdrop-blur-xl dark:bg-card/90 lg:hidden">
      {items.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-[10px] font-medium transition-colors",
              isActive ? "text-primary" : "text-muted-foreground"
            )}
          >
            <Icon className={cn("h-5 w-5", isActive && "text-primary")} />
            <span>{t(item.labelKey)}</span>
          </Link>
        );
      })}
    </nav>
  );
}
