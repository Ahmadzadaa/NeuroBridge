import { setRequestLocale } from "next-intl/server";
import { requireRole } from "@/lib/auth-utils";
import { ReportsPageClient } from "./reports-client";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function ReportsPage({
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
    <ReportsPageClient
      userName={session.user.name ?? "Admin"}
      programs={programs}
    />
  );
}
