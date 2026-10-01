"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { LargeTitle } from "@/components/ui/ios";
import { BadgeIcon, type BadgeIconState } from "@/components/ui/badge-icon";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BADGE_CATEGORIES } from "@/lib/constants";
import { cn } from "@/lib/utils";

export interface BadgeItem {
  id: string;
  key: string;
  nameTr: string;
  nameEn: string;
  nameAz: string;
  icon: string;
  coinValue: number;
  category: string;
  tier: string;
  earned: boolean;
}

interface BadgesPageClientProps {
  userName: string;
  locale: string;
  coinBalance: number;
  badges: BadgeItem[];
}

function getBadgeName(badge: BadgeItem, locale: string) {
  if (locale === "en") return badge.nameEn;
  if (locale === "az") return badge.nameAz;
  return badge.nameTr;
}

function badgeIconState(badge: BadgeItem): BadgeIconState {
  if (!badge.earned) return "locked";
  if (badge.tier === "crown") return "crown";
  return "earned";
}

function BadgeCard({
  badge,
  locale,
  earnedLabel,
}: {
  badge: BadgeItem;
  locale: string;
  earnedLabel: string;
}) {
  return (
    <div
      className={cn(
        "flex h-full flex-col items-center rounded-2xl bg-card p-4 text-center shadow-sm",
        "transition-shadow duration-[250ms] hover:shadow-md",
        badge.earned && badge.tier === "crown" &&
          "bg-gradient-to-br from-coin/10 to-coin/5"
      )}
    >
      <BadgeIcon icon={badge.icon} state={badgeIconState(badge)} />
      <p
        className={cn(
          "mt-3 text-[13px] font-semibold leading-tight",
          badge.earned ? "text-foreground" : "text-muted-foreground"
        )}
      >
        {getBadgeName(badge, locale)}
      </p>
      <p className="mt-1.5 text-[12px] font-semibold text-coin-dark">
        🪙 {badge.coinValue.toLocaleString()}
      </p>
      {badge.earned && (
        <span className="mt-2 inline-flex rounded-full bg-success-light px-2 py-px text-[10px] font-semibold uppercase tracking-[0.5px] text-success-dark">
          {earnedLabel}
        </span>
      )}
    </div>
  );
}

function BadgeGrid({
  badges,
  locale,
  earnedLabel,
}: {
  badges: BadgeItem[];
  locale: string;
  earnedLabel: string;
}) {

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {badges.map((badge, i) => (
        <motion.div
          key={badge.key}
          style={{ "--i": i } as React.CSSProperties}
        className="ios-reveal"
        >
          <BadgeCard badge={badge} locale={locale} earnedLabel={earnedLabel} />
        </motion.div>
      ))}
    </div>
  );
}

export function BadgesPageClient({
  userName,
  locale,
  coinBalance,
  badges,
}: BadgesPageClientProps) {
  const t = useTranslations("participant.badges");
  const tc = useTranslations("common");

  return (
    <DashboardLayout
      panel="participant"
      title={t("title")}
      userName={userName}
      coinBalance={coinBalance}
    >
      <LargeTitle
        className="mb-6"
        title={t("title")}
        subtitle={t("summary", { earned: badges.filter((x) => x.earned).length, total: badges.length })}
      />
      <Tabs defaultValue="all">
        <TabsList className="h-auto max-w-full flex-wrap">
          <TabsTrigger value="all">{tc("all")}</TabsTrigger>
          {BADGE_CATEGORIES.map((cat) => (
            <TabsTrigger key={cat} value={cat} className="capitalize">
              {cat.replace(/_/g, " ")}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <BadgeGrid
            badges={badges}
            locale={locale}
            earnedLabel={tc("earned")}
          />
        </TabsContent>

        {BADGE_CATEGORIES.map((cat) => (
          <TabsContent key={cat} value={cat} className="mt-4">
            <BadgeGrid
              badges={badges.filter((b) => b.category === cat)}
              locale={locale}
              earnedLabel={tc("earned")}
            />
          </TabsContent>
        ))}
      </Tabs>
    </DashboardLayout>
  );
}
