import { setRequestLocale } from "next-intl/server";
import { requireRole } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/billing/order-status";
import { OrdersClient, type OrderRow } from "./orders-client";

const PAGE_SIZE = 200;

export default async function BillingPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { locale } = await params;
  const { status } = await searchParams;
  setRequestLocale(locale);
  const session = await requireRole(locale, ["SUPER_ADMIN"]);

  const filter = ORDER_STATUSES.includes(status as OrderStatus) ? (status as OrderStatus) : undefined;

  const [orders, counts] = await Promise.all([
    prisma.order.findMany({
      where: filter ? { status: filter } : undefined,
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      include: {
        items: { select: { participantCount: true, service: { select: { code: true } } } },
        tenant: {
          select: {
            name: true,
            users: {
              where: { role: "TENANT_ADMIN" },
              select: {
                email: true,
                activationTokens: { where: { usedAt: { not: null } }, select: { id: true } },
              },
            },
          },
        },
      },
    }),
    prisma.order.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  const rows: OrderRow[] = orders.map((o) => {
    const admin = o.tenant?.users.find((u) => u.email === o.contactEmail);
    return {
      id: o.id,
      institutionName: o.institutionName,
      contactName: o.contactName,
      contactEmail: o.contactEmail,
      status: o.status as OrderStatus,
      total: o.total,
      currency: o.currency,
      createdAt: o.createdAt.toISOString(),
      tenantName: o.tenant?.name ?? null,
      activated: !!admin && admin.activationTokens.length > 0,
      items: o.items.map((i) => ({ code: i.service.code, participantCount: i.participantCount })),
    };
  });

  return (
    <OrdersClient
      locale={locale}
      userName={session.user.name ?? "Admin"}
      orders={rows}
      filter={filter ?? null}
      counts={Object.fromEntries(counts.map((c) => [c.status, c._count._all]))}
    />
  );
}
