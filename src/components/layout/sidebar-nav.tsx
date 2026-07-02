"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Building2,
  CreditCard,
  FileText,
  Headphones,
  Activity,
  ClipboardList,
  Users,
  BarChart3,
  Settings,
  Gamepad2,
  GraduationCap,
  Bot,
  Award,
  Trophy,
  User,
} from "lucide-react";

type PanelType = "super-admin" | "tenant" | "participant";

interface NavItem {
  href: string;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navConfig: Record<PanelType, NavItem[]> = {
  "super-admin": [
    { href: "/super-admin", labelKey: "dashboard", icon: LayoutDashboard },
    { href: "/super-admin/tenants", labelKey: "tenants", icon: Building2 },
    { href: "/super-admin/billing", labelKey: "billing", icon: CreditCard },
    { href: "/super-admin/content", labelKey: "content", icon: FileText },
    { href: "/super-admin/support", labelKey: "support", icon: Headphones },
    { href: "/super-admin/system", labelKey: "system", icon: Activity },
    { href: "/super-admin/audit", labelKey: "audit", icon: ClipboardList },
  ],
  tenant: [
    { href: "/tenant", labelKey: "dashboard", icon: LayoutDashboard },
    { href: "/tenant/programs", labelKey: "programs", icon: FileText },
    { href: "/tenant/participants", labelKey: "participants", icon: Users },
    { href: "/tenant/reports", labelKey: "reports", icon: BarChart3 },
    { href: "/tenant/settings", labelKey: "settings", icon: Settings },
    { href: "/tenant/billing", labelKey: "billing", icon: CreditCard },
  ],
  participant: [
    { href: "/participant", labelKey: "dashboard", icon: LayoutDashboard },
    { href: "/participant/simulations", labelKey: "simulations", icon: Gamepad2 },
    { href: "/participant/trainings", labelKey: "trainings", icon: GraduationCap },
    { href: "/participant/ai-tools", labelKey: "aiTools", icon: Bot },
    { href: "/participant/badges", labelKey: "badges", icon: Award },
    { href: "/participant/certificates", labelKey: "certificates", icon: FileText },
    { href: "/participant/leaderboard", labelKey: "leaderboard", icon: Trophy },
    { href: "/participant/profile", labelKey: "profile", icon: User },
  ],
};

interface SidebarNavProps {
  panel: PanelType;
  collapsed?: boolean;
}

export function SidebarNav({ panel, collapsed }: SidebarNavProps) {
  const t = useTranslations(`nav.${panel === "super-admin" ? "superAdmin" : panel}`);
  const pathname = usePathname();
  const items = navConfig[panel];

  return (
    <nav className="flex flex-col gap-1 p-3">
      {items.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== `/${panel}` && pathname.startsWith(item.href));
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            title={collapsed ? t(item.labelKey) : undefined}
            className={cn(
              "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium",
              "transition-all duration-150 ease-[cubic-bezier(0.4,0,0.2,1)]",
              "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              collapsed && "justify-center px-2",
              isActive
                ? "bg-accent text-primary shadow-[inset_3px_0_0_var(--color-primary)]"
                : "text-muted-foreground hover:translate-x-0.5 hover:bg-subtle hover:text-foreground"
            )}
          >
            <Icon
              className={cn(
                "h-[18px] w-[18px] shrink-0",
                !isActive && "opacity-70"
              )}
              aria-hidden="true"
            />
            {!collapsed && <span className="truncate">{t(item.labelKey)}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
