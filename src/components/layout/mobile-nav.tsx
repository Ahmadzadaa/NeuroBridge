"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { useTenantFeatures } from "@/components/providers/tenant-features-provider";
import type { TenantFeature } from "@/lib/tenant/features";
import { cn } from "@/lib/utils";
import { useSupportBadge } from "./use-support-badge";
import {
  LayoutDashboard,
  FileText,
  Users,
  BarChart3,
  TrendingUp,
  Settings,
  Gamepad2,
  GraduationCap,
  Award,
  Rocket,
  CalendarDays,
  ClipboardCheck,
  BookOpen,
  Inbox,
  Headphones,
} from "lucide-react";

type PanelType = "super-admin" | "tenant" | "participant" | "jury" | "teacher";

interface MobileNavItem {
  href: string;
  /** Shows the support count (requests needing attention) on the icon. */
  badge?: "support";
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Hidden when the organisation does not have this module. */
  feature?: TenantFeature;
}

const mobileNavConfig: Record<PanelType, MobileNavItem[]> = {
  "super-admin": [
    { href: "/super-admin", labelKey: "dashboard", icon: LayoutDashboard },
    { href: "/super-admin/tenants", labelKey: "tenants", icon: Users },
    { href: "/super-admin/billing", labelKey: "billing", icon: BarChart3 },
    { href: "/super-admin/leads", labelKey: "leads", icon: Inbox },
    { href: "/super-admin/support", labelKey: "support", icon: Headphones, badge: "support" },
  ],
  tenant: [
    { href: "/tenant", labelKey: "dashboard", icon: LayoutDashboard },
    { href: "/tenant/programs", labelKey: "programs", icon: FileText },
    { href: "/tenant/assessments", labelKey: "assessments", icon: ClipboardCheck },
    { href: "/tenant/participants", labelKey: "participants", icon: Users },
    { href: "/tenant/analytics", labelKey: "analytics", icon: TrendingUp },
    { href: "/tenant/reports", labelKey: "reports", icon: BarChart3 },
    { href: "/tenant/settings", labelKey: "settings", icon: Settings },
  ],
  participant: [
    { href: "/participant", labelKey: "dashboard", icon: LayoutDashboard },
    { href: "/participant/program", labelKey: "program", icon: CalendarDays },
    { href: "/participant/assessments", labelKey: "assessments", icon: ClipboardCheck },
    { href: "/participant/units", labelKey: "units", icon: BookOpen, feature: "simulations" },
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
    { href: "/participant/profile", labelKey: "profile", icon: Settings },
  ],
  jury: [
    { href: "/jury", labelKey: "dashboard", icon: LayoutDashboard },
    { href: "/jury/rankings", labelKey: "rankings", icon: Award },
    { href: "/jury/profile", labelKey: "profile", icon: Settings },
  ],
  teacher: [
    { href: "/teacher", labelKey: "dashboard", icon: LayoutDashboard },
    { href: "/teacher/scenarios", labelKey: "scenarios", icon: FileText },
    { href: "/teacher/grading", labelKey: "grading", icon: GraduationCap },
  ],
};

interface MobileNavProps {
  panel: PanelType;
}

export function MobileNav({ panel }: MobileNavProps) {
  const t = useTranslations(`nav.${panel === "super-admin" ? "superAdmin" : panel}`);
  const pathname = usePathname();
  const features = useTenantFeatures();
  const items = mobileNavConfig[panel].filter(
    (item) => item.feature === undefined || features[item.feature]
  );
  const supportCount = useSupportBadge(items.some((item) => item.badge === "support"));

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-border/60 bg-background/75 px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-1.5 backdrop-blur-2xl backdrop-saturate-150 lg:hidden">
      {items.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
        const Icon = item.icon;
        const count = item.badge === "support" ? supportCount : 0;

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            aria-label={count > 0 ? `${t(item.labelKey)} (${count})` : t(item.labelKey)}
            className={cn(
              "relative flex min-h-12 min-w-14 flex-col items-center justify-center gap-0.5 rounded-2xl px-3 py-1 text-[10px] font-semibold",
              "transition-colors duration-200 active:scale-95",
              "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              isActive ? "text-primary" : "text-muted-foreground"
            )}
          >
            <Icon
              className={cn(
                "h-5 w-5 transition-transform duration-150 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
                isActive && "scale-110 text-primary"
              )}
              aria-hidden="true"
            />
            {count > 0 && (
              <span
                className="absolute right-2 top-0.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold tabular-nums text-white ring-2 ring-background"
                aria-hidden="true"
              >
                {count > 99 ? "99+" : count}
              </span>
            )}
            <span
              className={cn(
                "transition-opacity duration-150",
                isActive ? "opacity-100" : "opacity-70"
              )}
            >
              {t(item.labelKey)}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
