import { setRequestLocale } from "next-intl/server";
import { requireRole } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { BADGE_CATEGORIES } from "@/lib/constants";
import { formatDate } from "@/lib/format-date";
import { BadgesPageClient, type BadgeGroup } from "./badges-client";

const badgeName = (b: { nameAz: string; nameEn: string; nameTr: string }, locale: string) =>
  locale === "en" ? b.nameEn : locale === "az" ? b.nameAz : b.nameTr;

export default async function BadgesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireRole(locale, ["PARTICIPANT"]);

  const [badges, user] = await Promise.all([
    prisma.badge.findMany({
      orderBy: [{ category: "asc" }, { coinValue: "asc" }],
      select: { id: true, key: true, nameTr: true, nameEn: true, nameAz: true, coinValue: true, category: true, tier: true },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { coinBalance: true, userBadges: { select: { badgeId: true, earnedAt: true } } },
    }),
  ]);
  const earnedAt = new Map(user?.userBadges.map((ub) => [ub.badgeId, ub.earnedAt]));

  // Known categories in their curriculum order, then any newer ones.
  const categories = [
    ...BADGE_CATEGORIES.filter((c) => badges.some((b) => b.category === c)),
    ...new Set(badges.map((b) => b.category).filter((c) => !(BADGE_CATEGORIES as readonly string[]).includes(c))),
  ];

  const groups: BadgeGroup[] = categories.map((category) => {
    // Levels climb by coin value; the crown (mastery) badge closes the track.
    const inCategory = badges
      .filter((b) => b.category === category)
      .sort((a, b) => Number(a.tier === "crown") - Number(b.tier === "crown") || a.coinValue - b.coinValue);
    // Special achievements are independent; elsewhere the first unearned one is "next".
    const progression = category !== "special_achievement";
    const nextId = progression ? inCategory.find((b) => !earnedAt.has(b.id))?.id : undefined;
    let level = 0;
    return {
      category,
      progression,
      badges: inCategory.map((b) => {
        const crown = b.tier === "crown";
        if (!crown) level++;
        const when = earnedAt.get(b.id);
        return {
          id: b.id,
          key: b.key,
          name: badgeName(b, locale),
          coinValue: b.coinValue,
          crown,
          level: crown || !progression ? null : level,
          state: when ? "earned" : b.id === nextId ? "next" : "locked",
          earnedOn: when ? formatDate(when, locale, "medium") : null,
        };
      }),
    };
  });

  return (
    <BadgesPageClient
      userName={session.user.name ?? "Participant"}
      locale={locale}
      coinBalance={user?.coinBalance ?? 0}
      groups={groups}
    />
  );
}
