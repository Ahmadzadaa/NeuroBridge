import { setRequestLocale } from "next-intl/server";
import { requireRole } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { TenantsPageClient } from "./tenants-client";

export default async function TenantsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireRole(locale, ["SUPER_ADMIN"]);

  const tenants = await prisma.tenant.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      status: true,
      seatLimit: true,
      seatsUsed: true,
      planType: true,
      createdAt: true,
      _count: { select: { users: true, programs: true } },
    },
  });

  return (
    <TenantsPageClient
      locale={locale}
      userName={session.user.name ?? "Admin"}
      tenants={tenants.map((tenant) => ({
        id: tenant.id,
        name: tenant.name,
        email: tenant.email,
        status: tenant.status,
        seatLimit: tenant.seatLimit,
        seatsUsed: tenant.seatsUsed,
        planType: tenant.planType ?? "starter",
        createdAt: tenant.createdAt.toISOString(),
        userCount: tenant._count.users,
        programCount: tenant._count.programs,
      }))}
    />
  );
}
