import { setRequestLocale } from "next-intl/server";
import { requireRole } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { ParticipantDashboardClient } from "./dashboard-client";

export default async function ParticipantPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireRole(locale, ["PARTICIPANT"]);

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      coinBalance: true,
      _count: { select: { userBadges: true, certificates: true } },
    },
  });

  return (
    <ParticipantDashboardClient
      userName={session.user.name ?? "Participant"}
      coinBalance={user?.coinBalance ?? 0}
      badgeCount={user?._count.userBadges ?? 0}
      certificateCount={user?._count.certificates ?? 0}
    />
  );
}
