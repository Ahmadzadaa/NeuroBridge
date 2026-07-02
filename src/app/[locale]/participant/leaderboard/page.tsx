import { setRequestLocale } from "next-intl/server";
import { requireRole } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { LeaderboardClient } from "./leaderboard-client";

export default async function LeaderboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireRole(locale, ["PARTICIPANT"]);

  const [entries, me] = await Promise.all([
    prisma.user.findMany({
      where: {
        tenantId: session.user.tenantId ?? undefined,
        role: "PARTICIPANT",
      },
      orderBy: [{ coinBalance: "desc" }],
      take: 50,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        coinBalance: true,
        _count: { select: { userBadges: true } },
      },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { coinBalance: true },
    }),
  ]);

  return (
    <LeaderboardClient
      userName={session.user.name ?? "Participant"}
      currentUserId={session.user.id}
      coinBalance={me?.coinBalance ?? 0}
      entries={entries.map((user, index) => ({
        id: user.id,
        rank: index + 1,
        name:
          [user.firstName, user.lastName].filter(Boolean).join(" ") ||
          "Participant",
        coins: user.coinBalance,
        badges: user._count.userBadges,
      }))}
    />
  );
}
