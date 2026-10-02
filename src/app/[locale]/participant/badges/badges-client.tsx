"use client";

import { useState, type CSSProperties } from "react";
import { useTranslations } from "next-intl";
import { Coins, Crown, Target } from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { LargeTitle } from "@/components/ui/ios";
import { ProgressRing } from "@/components/dashboard/dashboard-kit";
import { BadgeMedal, type MedalState } from "@/components/badges/badge-medal";
import { CATEGORY_ICONS, categoryTone } from "@/lib/badges/badge-visuals";
import { cn } from "@/lib/utils";

export interface BadgeView {
  id: string;
  key: string;
  name: string;
  coinValue: number;
  crown: boolean;
  /** 1-based step on the category track; null for the crown (mastery) badge. */
  level: number | null;
  state: MedalState;
  earnedOn: string | null;
}

export interface BadgeGroup {
  category: string;
  /** False for standalone achievements, which have no levels or "next". */
  progression: boolean;
  badges: BadgeView[];
}

type Filter = "all" | "earned" | "open";

const SURFACE = "rounded-[22px] bg-card ring-1 ring-border/60 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)]";

export function BadgesPageClient({
  userName,
  locale,
  coinBalance,
  groups,
}: {
  userName: string;
  locale: string;
  coinBalance: number;
  groups: BadgeGroup[];
}) {
  const t = useTranslations("participant.badges");
  const [filter, setFilter] = useState<Filter>("all");

  const all = groups.flatMap((g) => g.badges);
  const earned = all.filter((b) => b.state === "earned");
  const crowns = all.filter((b) => b.crown);
  const nextUp = groups
    .flatMap((g) => g.badges.filter((b) => b.state === "next"))
    .sort((a, b) => a.coinValue - b.coinValue)[0];
  const number = new Intl.NumberFormat(locale === "en" ? "en-US" : "tr-TR");
  const categoryName = (c: string) => (t.has(`categories.${c}`) ? t(`categories.${c}` as never) : c.replace(/_/g, " "));

  const visible = groups
    .map((g) => ({
      ...g,
      shown: g.badges.filter((b) => filter === "all" || (filter === "earned" ? b.state === "earned" : b.state !== "earned")),
    }))
    .filter((g) => g.shown.length > 0);

  return (
    <DashboardLayout panel="participant" title={t("title")} userName={userName} coinBalance={coinBalance}>
      <div className="mx-auto max-w-5xl space-y-8">
        <LargeTitle title={t("title")} subtitle={t("subtitle")} />

        {/* Overview */}
        <section className={cn(SURFACE, "flex flex-col gap-6 p-5 sm:flex-row sm:items-center sm:p-6")} aria-label={t("overview")}>
          <ProgressRing
            value={all.length ? (earned.length / all.length) * 100 : 0}
            label={`${earned.length}/${all.length}`}
            caption={t("earnedCaption")}
            size={112}
            responsive
          />
          <dl className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3">
            <Stat icon={Crown} tone="text-amber-500" label={t("mastery")} value={`${crowns.filter((b) => b.state === "earned").length}/${crowns.length}`} />
            <Stat icon={Coins} tone="text-coin" label={t("coinsFromBadges")} value={number.format(earned.reduce((n, b) => n + b.coinValue, 0))} />
            <Stat icon={Target} tone="text-primary" label={t("nextGoal")} value={nextUp ? nextUp.name : t("allEarned")} small />
          </dl>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div role="group" aria-label={t("filterLabel")} className="inline-flex rounded-full bg-muted p-1 text-[13px] font-semibold">
            {(["all", "earned", "open"] as const).map((f) => (
              <button
                key={f}
                type="button"
                aria-pressed={filter === f}
                onClick={() => setFilter(f)}
                className={cn(
                  "rounded-full px-3.5 py-1.5 transition-colors",
                  filter === f ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t(`filter.${f}`)}
              </button>
            ))}
          </div>
          <p className="text-[12px] text-muted-foreground">{t("trackHint")}</p>
        </div>

        {visible.length === 0 && (
          <p className={cn(SURFACE, "px-4 py-10 text-center text-[14px] text-muted-foreground")}>{t("emptyFilter")}</p>
        )}

        {visible.map((group) => {
          const tone = categoryTone(group.category);
          const Icon = CATEGORY_ICONS[group.category] ?? Crown;
          const done = group.badges.filter((b) => b.state === "earned").length;
          const headingId = `badges-${group.category}`;
          return (
            <section key={group.category} aria-labelledby={headingId} className="space-y-3">
              <div className="flex items-center gap-3 px-1">
                <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px]", tone.chip)} aria-hidden="true">
                  <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
                </span>
                <h2 id={headingId} className="min-w-0 flex-1 truncate text-[17px] font-bold tracking-[-0.3px]">
                  {categoryName(group.category)}
                </h2>
                <span className="text-[13px] font-semibold tabular-nums text-muted-foreground">
                  {done}/{group.badges.length}
                </span>
                <span className="hidden h-1.5 w-24 overflow-hidden rounded-full bg-muted sm:block" aria-hidden="true">
                  <span className={cn("block h-full rounded-full", tone.bar)} style={{ width: `${(done / group.badges.length) * 100}%` }} />
                </span>
              </div>
              {/* A level track stays on one row on wide screens; standalone achievements wrap as a grid. */}
              <ul
                className={cn(
                  "grid grid-cols-2 gap-3",
                  group.progression ? "sm:grid-cols-3 lg:flex [&>li]:lg:min-w-0 [&>li]:lg:flex-1" : "sm:grid-cols-[repeat(auto-fill,minmax(140px,1fr))]"
                )}
              >
                {group.shown.map((badge, i) => (
                  <BadgeCard key={badge.id} badge={badge} category={group.category} index={i} />
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </DashboardLayout>
  );
}

function Stat({
  icon: Icon,
  tone,
  label,
  value,
  small,
}: {
  icon: typeof Crown;
  tone: string;
  label: string;
  value: string;
  small?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-muted/50 px-4 py-3">
      <dt className="flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground">
        <Icon className={cn("h-3.5 w-3.5", tone)} aria-hidden="true" />
        {label}
      </dt>
      <dd className={cn("mt-1 truncate font-bold tabular-nums tracking-[-0.3px]", small ? "text-[15px]" : "text-[20px]")}>{value}</dd>
    </div>
  );
}

function BadgeCard({ badge, category, index }: { badge: BadgeView; category: string; index: number }) {
  const t = useTranslations("participant.badges");
  const status =
    badge.state === "earned" ? t("earnedOn", { date: badge.earnedOn ?? "" }) : badge.state === "next" ? t("next") : t("locked");
  return (
    <li
      style={{ "--i": index } as CSSProperties}
      className={cn(
        "ios-reveal flex flex-col items-center rounded-2xl bg-card px-3 pb-3.5 pt-4 text-center ring-1 transition-colors",
        badge.state === "next" ? "ring-primary/35" : "ring-border/60",
        badge.state === "locked" && "bg-card/60"
      )}
    >
      <BadgeMedal badgeKey={badge.key} category={category} crown={badge.crown} state={badge.state} />
      <p
        className={cn(
          "mt-2.5 text-[11px] font-semibold uppercase tracking-[0.5px]",
          badge.crown ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
        )}
      >
        {badge.crown ? t("masteryLevel") : badge.level ? t("level", { n: badge.level }) : t("special")}
      </p>
      <p className={cn("mt-1 line-clamp-2 min-h-[2.5em] text-[13px] font-semibold leading-tight", badge.state === "earned" ? "text-foreground" : "text-muted-foreground")}>
        {badge.name}
      </p>
      <p className="mt-2 inline-flex items-center gap-1 text-[12px] font-semibold tabular-nums text-muted-foreground">
        <Coins className="h-3.5 w-3.5 text-coin" aria-hidden="true" />
        {badge.coinValue}
      </p>
      <p className={cn("mt-1 text-[11px]", badge.state === "next" ? "font-semibold text-primary" : "text-muted-foreground")}>{status}</p>
    </li>
  );
}
