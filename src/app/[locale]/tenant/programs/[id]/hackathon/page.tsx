import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { computeRankings } from "@/lib/hackathon/ranking";
import { HackathonAdminClient } from "./hackathon-admin-client";

export default async function HackathonAdminPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const session = await requireRole(locale, ["TENANT_ADMIN", "TENANT_VIEWER"]);

  const program = await prisma.program.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      type: true,
      tenantId: true,
      resultsRevealAt: true,
    },
  });

  if (
    !program ||
    program.type !== "hackathon" ||
    (session.user.tenantId && program.tenantId !== session.user.tenantId)
  ) {
    notFound();
  }

  const [criteria, rankings, juries, hasScores] = await Promise.all([
    prisma.juryCriterion.findMany({
      where: { programId: id },
      orderBy: { order: "asc" },
      select: { id: true, name: true, maxScore: true, weight: true },
    }),
    computeRankings(id),
    prisma.user.findMany({
      where: { tenantId: program.tenantId, role: "JURY" },
      select: { id: true, firstName: true, lastName: true, email: true },
    }),
    prisma.juryScore
      .findFirst({
        where: { criterion: { programId: id } },
        select: { id: true },
      })
      .then(Boolean),
  ]);

  return (
    <HackathonAdminClient
      locale={locale}
      userName={session.user.name ?? "Admin"}
      canManage={session.user.role === "TENANT_ADMIN"}
      program={{
        id: program.id,
        name: program.name,
        resultsRevealAt: program.resultsRevealAt?.toISOString() ?? null,
      }}
      criteria={criteria}
      rankings={rankings}
      hasScores={hasScores}
      juries={juries.map((j) => ({
        id: j.id,
        name: [j.firstName, j.lastName].filter(Boolean).join(" ") || j.email,
        email: j.email,
      }))}
    />
  );
}
