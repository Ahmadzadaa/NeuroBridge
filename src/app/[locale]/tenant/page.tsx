import { setRequestLocale } from "next-intl/server";
import { requireRole } from "@/lib/auth-utils";
import { TenantDashboardClient } from "./dashboard-client";
import { prisma } from "@/lib/prisma";

export default async function TenantPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireRole(locale, ["TENANT_ADMIN", "TENANT_VIEWER"]);

  const tenant = session.user.tenantId
    ? await prisma.tenant.findUnique({
        where: { id: session.user.tenantId },
        select: {
          seatLimit: true,
          seatsUsed: true,
          _count: { select: { programs: true } },
        },
      })
    : null;

  return (
    <TenantDashboardClient
      userName={session.user.name ?? "Admin"}
      seatsUsed={tenant?.seatsUsed ?? 0}
      seatLimit={tenant?.seatLimit ?? 0}
      programCount={tenant?._count.programs ?? 0}
    />
  );
}
