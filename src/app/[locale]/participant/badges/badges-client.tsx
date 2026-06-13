"use client";

import { useTranslations } from "next-intl";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { BADGE_CATEGORIES } from "@/lib/constants";

const badgeData = [
  { key: "welcome_badge", icon: "👋", nameTr: "Hoş geldin Rozeti", nameEn: "Welcome Badge", nameAz: "Xoş gəlmisiniz Nişanı", coinValue: 100, category: "idea_development", tier: "regular" },
  { key: "problem_explorer", icon: "🔍", nameTr: "Problem Kaşifi", nameEn: "Problem Explorer", nameAz: "Problem Araşdırıcısı", coinValue: 50, category: "idea_development", tier: "regular" },
  { key: "idea_generator", icon: "💡", nameTr: "Fikir Üreticisi", nameEn: "Idea Generator", nameAz: "Fikir Yaradıcısı", coinValue: 75, category: "idea_development", tier: "regular" },
  { key: "innovation_architect", icon: "👑", nameTr: "İnovasyon Mimarı", nameEn: "Innovation Architect", nameAz: "İnnovasiya Memarı", coinValue: 300, category: "idea_development", tier: "crown" },
  { key: "startup_architect", icon: "👑", nameTr: "Startup Mimarı", nameEn: "Startup Architect", nameAz: "Startup Memarı", coinValue: 350, category: "startup_management", tier: "crown" },
  { key: "finance_master", icon: "👑", nameTr: "Finans Ustası", nameEn: "Finance Master", nameAz: "Maliyyə Ustası", coinValue: 350, category: "finance", tier: "crown" },
  { key: "marketing_master", icon: "👑", nameTr: "Pazarlama Ustası", nameEn: "Marketing Master", nameAz: "Marketinq Ustası", coinValue: 350, category: "sales_marketing", tier: "crown" },
  { key: "global_entrepreneur", icon: "👑", nameTr: "Küresel Girişimci", nameEn: "Global Entrepreneur", nameAz: "Qlobal Sahibkar", coinValue: 500, category: "globalization", tier: "crown" },
  { key: "coin_millionaire", icon: "💎", nameTr: "Coin Milyoneri", nameEn: "Coin Millionaire", nameAz: "Coin Milyoneri", coinValue: 1000, category: "special_achievement", tier: "regular" },
];

interface BadgesPageClientProps {
  userName: string;
  locale: string;
}

function getBadgeName(badge: (typeof badgeData)[0], locale: string) {
  if (locale === "en") return badge.nameEn;
  if (locale === "az") return badge.nameAz;
  return badge.nameTr;
}

export function BadgesPageClient({ userName, locale }: BadgesPageClientProps) {
  const t = useTranslations("participant.badges");

  return (
    <DashboardLayout panel="participant" title={t("title")} userName={userName}>
      <Tabs defaultValue="all">
        <TabsList className="rounded-xl flex-wrap h-auto">
          <TabsTrigger value="all">All</TabsTrigger>
          {BADGE_CATEGORIES.map((cat) => (
            <TabsTrigger key={cat} value={cat} className="capitalize">
              {cat.replace(/_/g, " ")}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {badgeData.map((badge, i) => (
              <motion.div
                key={badge.key}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ y: -4, scale: 1.02 }}
              >
                <Card className={`rounded-2xl border-0 shadow-sm text-center transition-shadow hover:shadow-md ${badge.tier === "crown" ? "bg-gradient-to-br from-amber-500/10 to-yellow-500/5" : ""}`}>
                  <CardContent className="p-4">
                    <div className="text-3xl mb-2">{badge.icon}</div>
                    <p className="text-xs font-medium leading-tight">{getBadgeName(badge, locale)}</p>
                    <p className="mt-1 text-xs text-amber-600 dark:text-amber-400 font-semibold">
                      🪙 {badge.coinValue}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        {BADGE_CATEGORIES.map((cat) => (
          <TabsContent key={cat} value={cat} className="mt-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {badgeData
                .filter((b) => b.category === cat)
                .map((badge) => (
                  <Card key={badge.key} className="rounded-2xl border-0 shadow-sm text-center">
                    <CardContent className="p-4">
                      <div className="text-3xl mb-2">{badge.icon}</div>
                      <p className="text-xs font-medium">{getBadgeName(badge, locale)}</p>
                      <p className="mt-1 text-xs text-amber-600 font-semibold">🪙 {badge.coinValue}</p>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </DashboardLayout>
  );
}
