import { setRequestLocale } from "next-intl/server";
import { requireRole } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { BadgesPageClient } from "./badges-client";

export default async function BadgesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireRole(locale, ["PARTICIPANT"]);

  const [badges, user] = await Promise.all([
    prisma.badge.findMany({
      orderBy: [{ category: "asc" }, { coinValue: "asc" }],
      select: {
        id: true,
        key: true,
        nameTr: true,
        nameEn: true,
        nameAz: true,
        icon: true,
        coinValue: true,
        category: true,
        tier: true,
      },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        coinBalance: true,
        userBadges: { select: { badgeId: true } },
      },
    }),
  ]);

  const earnedBadgeIds = new Set(user?.userBadges.map((ub) => ub.badgeId));

  return (
    <BadgesPageClient
      userName={session.user.name ?? "Participant"}
      locale={locale}
      coinBalance={user?.coinBalance ?? 0}
      badges={badges.map((badge) => ({
        ...badge,
        earned: earnedBadgeIds.has(badge.id),
      }))}
    />
  );
}
