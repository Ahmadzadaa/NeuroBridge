import { setRequestLocale } from "next-intl/server";
import { requireRole } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { ServicesClient, type ServiceRow } from "./services-client";

export default async function PricingAdminPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireRole(locale, ["SUPER_ADMIN"]);

  const services = await prisma.service.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
    include: {
      tiers: { orderBy: { minParticipants: "asc" } },
      _count: { select: { orderItems: true, tenantServices: true } },
    },
  });

  const rows: ServiceRow[] = services.map((s) => ({
    id: s.id,
    code: s.code,
    name: s.name,
    active: s.active,
    inUse: s._count.orderItems > 0 || s._count.tenantServices > 0,
    tiers: s.tiers.map((t) => ({
      minParticipants: t.minParticipants,
      maxParticipants: t.maxParticipants,
      pricePerParticipant: t.pricePerParticipant,
    })),
  }));

  return <ServicesClient userName={session.user.name ?? "Admin"} services={rows} />;
}
