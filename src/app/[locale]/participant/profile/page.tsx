import { setRequestLocale } from "next-intl/server";
import { requireRole } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { ProfileClient } from "./profile-client";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireRole(locale, ["PARTICIPANT"]);

  const [user, examsPassed] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        language: true,
        coinBalance: true,
        createdAt: true,
        _count: { select: { userBadges: true, certificates: true } },
      },
    }),
    prisma.examAttempt.count({
      where: { userId: session.user.id, passed: true },
    }),
  ]);

  if (!user) return null;

  return (
    <ProfileClient
      locale={locale}
      profile={{
        email: user.email,
        firstName: user.firstName ?? "",
        lastName: user.lastName ?? "",
        phone: user.phone ?? "",
        language: user.language,
        coinBalance: user.coinBalance,
        memberSince: user.createdAt.toISOString(),
        badges: user._count.userBadges,
        certificates: user._count.certificates,
        examsPassed,
      }}
    />
  );
}
