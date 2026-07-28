"use client";

import { useTranslations } from "next-intl";
import { useTenantFeatures } from "@/components/providers/tenant-features-provider";
import type { TenantFeature } from "@/lib/tenant/features";
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
  Rocket,
  Scale,
} from "lucide-react";

type PanelType = "super-admin" | "tenant" | "participant" | "jury" | "teacher";

interface NavItem {
  href: string;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Hidden when the organisation does not have this module. */
  feature?: TenantFeature;
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
    {
      href: "/tenant/simulations",
      labelKey: "simulations",
      icon: Gamepad2,
      feature: "simulations",
    },
    {
      href: "/tenant/teachers",
      labelKey: "teachers",
      icon: GraduationCap,
      feature: "teachers",
    },
    { href: "/tenant/participants", labelKey: "participants", icon: Users },
    { href: "/tenant/reports", labelKey: "reports", icon: BarChart3 },
    { href: "/tenant/settings", labelKey: "settings", icon: Settings },
    { href: "/tenant/billing", labelKey: "billing", icon: CreditCard },
  ],
  participant: [
    { href: "/participant", labelKey: "dashboard", icon: LayoutDashboard },
    {
      href: "/participant/simulations",
      labelKey: "simulations",
      icon: Gamepad2,
      feature: "simulations",
    },
    {
      href: "/participant/trainings",
      labelKey: "trainings",
      icon: GraduationCap,
      feature: "trainings",
    },
    {
      href: "/participant/hackathon",
      labelKey: "hackathon",
      icon: Rocket,
      feature: "hackathon",
    },
    {
      href: "/participant/ai-tools",
      labelKey: "aiTools",
      icon: Bot,
      feature: "aiTools",
    },
    { href: "/participant/badges", labelKey: "badges", icon: Award },
    { href: "/participant/certificates", labelKey: "certificates", icon: FileText },
    { href: "/participant/leaderboard", labelKey: "leaderboard", icon: Trophy },
    { href: "/participant/profile", labelKey: "profile", icon: User },
  ],
  jury: [
    { href: "/jury", labelKey: "dashboard", icon: LayoutDashboard },
    { href: "/jury/rankings", labelKey: "rankings", icon: Scale },
  ],
  teacher: [
    { href: "/teacher", labelKey: "dashboard", icon: LayoutDashboard },
    { href: "/teacher/scenarios", labelKey: "scenarios", icon: FileText },
    { href: "/teacher/grading", labelKey: "grading", icon: GraduationCap },
  ],
};

interface SidebarNavProps {
  panel: PanelType;
  collapsed?: boolean;
}

export function SidebarNav({ panel, collapsed }: SidebarNavProps) {
  const t = useTranslations(`nav.${panel === "super-admin" ? "superAdmin" : panel}`);
  const pathname = usePathname();
  const features = useTenantFeatures();
  const items = navConfig[panel].filter(
    (item) => item.feature === undefined || features[item.feature]
  );

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
