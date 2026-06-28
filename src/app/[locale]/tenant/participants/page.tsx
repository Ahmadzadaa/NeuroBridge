import { setRequestLocale } from "next-intl/server";
import { requireRole } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { ParticipantsPageClient } from "./participants-client";

export default async function ParticipantsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireRole(locale, ["TENANT_ADMIN", "TENANT_VIEWER"]);

  if (!session.user.tenantId) {
    redirect(`/${locale}/tenant`);
  }

  const programs = await prisma.program.findMany({
    where: { tenantId: session.user.tenantId },
    select: { id: true, name: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <ParticipantsPageClient
      userName={session.user.name ?? "Admin"}
      programs={programs}
    />
  );
}
