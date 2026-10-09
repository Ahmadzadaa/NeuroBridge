"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { useTenantFeatures } from "@/components/providers/tenant-features-provider";
import { cn } from "@/lib/utils";
import { useSupportBadge } from "./use-support-badge";
import { navConfig, type NavItem, type PanelType } from "./sidebar-nav";
import { CalendarDays, Gamepad2, GraduationCap, Grid2x2, Headphones, LayoutDashboard, TrendingUp, Users, FileText, Inbox, Award, X } from "lucide-react";

/**
 * The phone's tab bar: at most four destinations people use daily, then
 * "More", which opens every other page of the panel as a sheet. A bar that
 * tried to fit everything ran off the screen.
 */
const TAB_BAR_SIZE = 4;

const primary: Record<PanelType, { href: string; labelKey: string; icon: NavItem["icon"]; feature?: NavItem["feature"]; badge?: "support" }[]> = {
  "super-admin": [
    { href: "/super-admin", labelKey: "dashboard", icon: LayoutDashboard },
    { href: "/super-admin/tenants", labelKey: "tenants", icon: Users },
    { href: "/super-admin/leads", labelKey: "leads", icon: Inbox },
    { href: "/super-admin/support", labelKey: "support", icon: Headphones, badge: "support" },
  ],
  tenant: [
    { href: "/tenant", labelKey: "dashboard", icon: LayoutDashboard },
    { href: "/tenant/programs", labelKey: "programs", icon: FileText },
    { href: "/tenant/participants", labelKey: "participants", icon: Users },
    { href: "/tenant/analytics", labelKey: "analytics", icon: TrendingUp },
  ],
  participant: [
    { href: "/participant", labelKey: "dashboard", icon: LayoutDashboard },
    { href: "/participant/program", labelKey: "program", icon: CalendarDays },
    { href: "/participant/simulations", labelKey: "simulations", icon: Gamepad2, feature: "simulations" },
    { href: "/participant/trainings", labelKey: "trainings", icon: GraduationCap, feature: "trainings" },
    // Fills the bar when a module above is switched off.
    { href: "/participant/certificates", labelKey: "certificates", icon: Award },
  ],
  jury: [
    { href: "/jury", labelKey: "dashboard", icon: LayoutDashboard },
    { href: "/jury/rankings", labelKey: "rankings", icon: Award },
  ],
  teacher: [
    { href: "/teacher", labelKey: "dashboard", icon: LayoutDashboard },
    { href: "/teacher/scenarios", labelKey: "scenarios", icon: FileText },
    { href: "/teacher/grading", labelKey: "grading", icon: GraduationCap },
  ],
};

const isActivePath = (pathname: string, href: string, panel: PanelType) =>
  pathname === href || (href !== `/${panel}` && pathname.startsWith(href + "/"));

function Badge({ count, className }: { count: number; className?: string }) {
  if (count <= 0) return null;
  return (
    <span
      className={cn(
        "absolute inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold tabular-nums text-white ring-2 ring-background",
        className
      )}
      aria-hidden="true"
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

export function MobileNav({ panel }: { panel: PanelType }) {
  const t = useTranslations(`nav.${panel === "super-admin" ? "superAdmin" : panel}`);
  const tc = useTranslations("common");
  const pathname = usePathname();
  const features = useTenantFeatures();
  const [moreOpen, setMoreOpen] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  const allowed = <T extends { feature?: NavItem["feature"] }>(item: T) => item.feature === undefined || features[item.feature];
  const bar = primary[panel].filter(allowed).slice(0, TAB_BAR_SIZE);
  const rest = navConfig[panel].filter(allowed).filter((item) => !bar.some((b) => b.href === item.href));
  const supportCount = useSupportBadge([...bar, ...rest].some((item) => item.badge === "support"));
  const restActive = rest.some((item) => isActivePath(pathname, item.href, panel));
  const restCount = rest.some((item) => item.badge === "support") ? supportCount : 0;

  // Closes on navigation (the page changed underneath) and on Escape.
  const [openedAt, setOpenedAt] = useState(pathname);
  if (moreOpen && openedAt !== pathname) {
    setMoreOpen(false);
    setOpenedAt(pathname);
  }
  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMoreOpen(false);
    document.addEventListener("keydown", onKey);
    sheetRef.current?.querySelector<HTMLElement>("a,button")?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [moreOpen]);

  const tab = "relative flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-1 text-[10px] font-semibold transition-colors duration-200 active:scale-95 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-stretch border-t border-border/60 bg-background/80 px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-1.5 backdrop-blur-2xl backdrop-saturate-150 lg:hidden">
        {bar.map((item) => {
          const active = isActivePath(pathname, item.href, panel);
          const Icon = item.icon;
          const count = item.badge === "support" ? supportCount : 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              aria-label={count > 0 ? `${t(item.labelKey)} (${count})` : undefined}
              className={cn(tab, active ? "text-primary" : "text-muted-foreground")}
            >
              <Icon className={cn("h-[22px] w-[22px] transition-transform duration-150", active && "scale-110")} aria-hidden="true" />
              <Badge count={count} className="left-1/2 top-0 ml-1.5" />
              <span className={cn("w-full truncate text-center", active ? "opacity-100" : "opacity-75")}>{t(item.labelKey)}</span>
            </Link>
          );
        })}
        {rest.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setOpenedAt(pathname);
              setMoreOpen(true);
            }}
            aria-haspopup="dialog"
            aria-expanded={moreOpen}
            className={cn(tab, restActive || moreOpen ? "text-primary" : "text-muted-foreground")}
          >
            <Grid2x2 className="h-[22px] w-[22px]" aria-hidden="true" />
            <Badge count={restCount} className="left-1/2 top-0 ml-1.5" />
            <span className={cn("w-full truncate text-center", restActive ? "opacity-100" : "opacity-75")}>{tc("more")}</span>
          </button>
        )}
      </nav>

      {moreOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden" role="presentation">
          <button type="button" aria-label={tc("close")} className="absolute inset-0 bg-black/40 backdrop-blur-[2px] animate-in fade-in-0" onClick={() => setMoreOpen(false)} />
          <div
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-label={tc("more")}
            className="absolute inset-x-0 bottom-0 max-h-[80vh] overflow-y-auto rounded-t-[28px] bg-card px-4 pb-[max(env(safe-area-inset-bottom),1rem)] pt-2.5 shadow-[0_-20px_50px_-20px_rgba(15,23,42,0.5)] animate-in slide-in-from-bottom duration-300"
          >
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-muted-foreground/30" aria-hidden="true" />
            <div className="mb-3 flex items-center justify-between px-1">
              <p className="text-[17px] font-bold tracking-[-0.3px]">{tc("more")}</p>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                aria-label={tc("close")}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <ul className="grid grid-cols-3 gap-2 pb-2">
              {rest.map((item) => {
                const active = isActivePath(pathname, item.href, panel);
                const Icon = item.icon;
                const count = item.badge === "support" ? supportCount : 0;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setMoreOpen(false)}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "relative flex flex-col items-center gap-1.5 rounded-[18px] px-2 py-3 text-center transition-colors active:scale-[0.97]",
                        active ? "bg-primary/10 text-primary" : "bg-muted/50 text-foreground hover:bg-muted"
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-11 w-11 items-center justify-center rounded-[13px] shadow-sm",
                          active ? "bg-primary text-primary-foreground" : "bg-card text-primary ring-1 ring-border/60"
                        )}
                        aria-hidden="true"
                      >
                        <Icon className="h-5 w-5" />
                      </span>
                      <Badge count={count} className="right-3 top-2" />
                      <span className="line-clamp-2 text-[12px] font-medium leading-tight">{t(item.labelKey)}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
