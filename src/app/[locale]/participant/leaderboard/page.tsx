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

  // Scoped to the student's own university (tenant). Without a tenant there
  // is nothing to rank against — never fall back to an unfiltered query.
  const tenantId = session.user.tenantId;
  const scope = { tenantId: tenantId ?? "__none__", role: "PARTICIPANT" };

  const [entries, me] = await Promise.all([
    prisma.user.findMany({
      where: scope,
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

  const myCoins = me?.coinBalance ?? 0;
  const [ahead, total] = await Promise.all([
    prisma.user.count({ where: { ...scope, coinBalance: { gt: myCoins } } }),
    prisma.user.count({ where: scope }),
  ]);

  return (
    <LeaderboardClient
      myRank={tenantId ? ahead + 1 : null}
      totalParticipants={total}
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
