"use client";

import { useTranslations } from "next-intl";
import { useTenantFeatures } from "@/components/providers/tenant-features-provider";
import type { TenantFeature } from "@/lib/tenant/features";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { useSupportBadge } from "./use-support-badge";
import { motion, useReducedMotion } from "framer-motion";
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
  TrendingUp,
  Settings,
  Gamepad2,
  GraduationCap,
  Bot,
  Award,
  Trophy,
  User,
  Rocket,
  Scale,
  Tag,
  CalendarDays,
  ClipboardCheck,
  BookOpen,
  Inbox,
} from "lucide-react";

export type PanelType = "super-admin" | "tenant" | "participant" | "jury" | "teacher";

export interface NavItem {
  href: string;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Hidden when the organisation does not have this module. */
  feature?: TenantFeature;
  /** Shows the support count (requests needing attention) beside the label. */
  badge?: "support";
}

export const navConfig: Record<PanelType, NavItem[]> = {
  "super-admin": [
    { href: "/super-admin", labelKey: "dashboard", icon: LayoutDashboard },
    { href: "/super-admin/tenants", labelKey: "tenants", icon: Building2 },
    { href: "/super-admin/leads", labelKey: "leads", icon: Inbox },
    { href: "/super-admin/programs", labelKey: "programs", icon: FileText },
    { href: "/super-admin/billing", labelKey: "billing", icon: CreditCard },
    { href: "/super-admin/pricing", labelKey: "pricing", icon: Tag },
    { href: "/super-admin/content", labelKey: "content", icon: FileText },
    { href: "/super-admin/support", labelKey: "support", icon: Headphones, badge: "support" },
    { href: "/super-admin/ai-usage", labelKey: "aiUsage", icon: Bot },
    { href: "/super-admin/system", labelKey: "system", icon: Activity },
    { href: "/super-admin/audit", labelKey: "audit", icon: ClipboardList },
  ],
  tenant: [
    { href: "/tenant", labelKey: "dashboard", icon: LayoutDashboard },
    { href: "/tenant/programs", labelKey: "programs", icon: FileText },
    { href: "/tenant/assessments", labelKey: "assessments", icon: ClipboardCheck },
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
    { href: "/tenant/certificates", labelKey: "certificates", icon: Award },
    { href: "/tenant/analytics", labelKey: "analytics", icon: TrendingUp },
    { href: "/tenant/reports", labelKey: "reports", icon: BarChart3 },
    { href: "/tenant/settings", labelKey: "settings", icon: Settings },
    { href: "/tenant/billing", labelKey: "billing", icon: CreditCard },
    { href: "/tenant/support", labelKey: "support", icon: Headphones, badge: "support" },
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
    { href: "/jury/profile", labelKey: "profile", icon: User },
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
  const reduced = useReducedMotion();
  const items = navConfig[panel].filter(
    (item) => item.feature === undefined || features[item.feature]
  );
  const supportCount = useSupportBadge(items.some((item) => item.badge === "support"));

  return (
    <nav className="flex flex-col gap-1 p-3">
      {items.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== `/${panel}` && pathname.startsWith(item.href));
        const Icon = item.icon;
        const count = item.badge === "support" ? supportCount : 0;

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            title={collapsed ? (count > 0 ? `${t(item.labelKey)} (${count})` : t(item.labelKey)) : undefined}
            className={cn(
              "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium",
              "transition-colors duration-200",
              "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              collapsed && "justify-center px-2",
              isActive
                ? "text-primary"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            )}
          >
            {/* The active pill glides between items instead of jumping. */}
            {isActive && (
              <motion.span
                layoutId={reduced ? undefined : `nav-pill-${panel}`}
                className="absolute inset-0 rounded-xl bg-accent shadow-[0_1px_2px_rgba(15,23,42,0.06)] ring-1 ring-primary/10"
                transition={{ type: "spring", stiffness: 500, damping: 40 }}
                aria-hidden="true"
              />
            )}
            <Icon
              className={cn(
                "relative h-[18px] w-[18px] shrink-0",
                !isActive && "opacity-70"
              )}
              aria-hidden="true"
            />
            {!collapsed && <span className="relative min-w-0 flex-1 truncate">{t(item.labelKey)}</span>}
            {count > 0 &&
              (collapsed ? (
                <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-destructive ring-2 ring-sidebar" aria-hidden="true" />
              ) : (
                <span
                  className="relative ml-auto inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-destructive px-1.5 text-[11px] font-semibold tabular-nums text-white"
                  aria-label={t("supportBadge", { count })}
                >
                  {count > 99 ? "99+" : count}
                </span>
              ))}
          </Link>
        );
      })}
    </nav>
  );
}
