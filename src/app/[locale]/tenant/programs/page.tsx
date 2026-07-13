import { setRequestLocale } from "next-intl/server";
import { requireRole } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { ProgramsPageClient } from "./programs-client";

export default async function ProgramsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireRole(locale, ["TENANT_ADMIN", "TENANT_VIEWER"]);

  const programs = session.user.tenantId
    ? await prisma.program.findMany({
        where: { tenantId: session.user.tenantId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          type: true,
          applicationStart: true,
          applicationEnd: true,
          participantLimit: true,
          applicationToken: true,
          _count: { select: { participants: true, hackathonTeams: true } },
        },
      })
    : [];

  return (
    <ProgramsPageClient
      locale={locale}
      userName={session.user.name ?? "Admin"}
      programs={programs.map((p) => ({
        id: p.id,
        name: p.name,
        type: p.type,
        applicationStart: p.applicationStart.toISOString(),
        applicationEnd: p.applicationEnd.toISOString(),
        participantLimit: p.participantLimit,
        applicationToken: p.applicationToken,
        participantCount: p._count.participants,
        teamCount: p._count.hackathonTeams,
      }))}
    />
  );
}
