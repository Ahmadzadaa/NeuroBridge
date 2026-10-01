import { getTranslations, setRequestLocale } from "next-intl/server";
import { FolderKanban, Plus, Receipt, TrendingUp, Users } from "lucide-react";
import { requireRole } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { formatKurus } from "@/lib/billing/money";
import { listTenantPayments } from "@/lib/payment/payment-service";
import { getTenantSeatSnapshot } from "@/lib/seats/seat-service";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { InsetGroup, InsetRow, LargeTitle, Reveal } from "@/components/ui/ios";
import { MetricGrid, MetricTile } from "@/components/dashboard/dashboard-kit";
import { BillingClient } from "./billing-client";

/** Seats, buying more programmes or seats, and every order and payment the organisation made. */
export default async function TenantBillingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireRole(locale, ["TENANT_ADMIN"]);
  const tenantId = session.user.tenantId!;

  const [t, tSeats, tHome, seats, payments, orders] = await Promise.all([
    getTranslations("tenant.billing"),
    getTranslations("tenant.seats"),
    getTranslations("superAdmin.home"),
    getTenantSeatSnapshot(tenantId),
    listTenantPayments(tenantId),
    prisma.order.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, kind: true, status: true, total: true, currency: true, createdAt: true },
    }),
  ]);

  // tr-TR for az: Node and browsers format az numbers and dates differently.
  const intl = locale === "en" ? "en-GB" : "tr-TR";
  const date = new Intl.DateTimeFormat(intl, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  const limit = seats?.seatLimit ?? 0;
  const used = seats?.seatsUsed ?? 0;
  const statusTone = (status: string) =>
    status === "PAID" || status === "COMPLETED" ? "emerald" : status === "FAILED" ? "rose" : "slate";

  return (
    <DashboardLayout panel="tenant" title={t("title")} userName={session.user.name ?? "Admin"}>
      <div className="mx-auto max-w-4xl space-y-8">
        <LargeTitle title={t("title")} subtitle={t("subtitle")} />

        <MetricGrid>
          <MetricTile index={1} icon={Users} tone="indigo" value={limit} label={tSeats("total")} />
          <MetricTile index={2} icon={TrendingUp} tone="violet" value={used} label={tSeats("used")} />
          <MetricTile index={3} icon={Users} tone="emerald" value={Math.max(limit - used, 0)} label={tSeats("remaining")} />
          <MetricTile index={4} icon={Receipt} tone="amber" value={orders.length + payments.length} label={t("paymentHistory")} />
        </MetricGrid>

        <Reveal index={5}>
          <InsetGroup header={t("buyHeading")} footer={t("buyFooter")}>
            <InsetRow href="/tenant/programs/buy" icon={Plus} tone="indigo" title={t("buyProgram")} subtitle={t("buyProgramHint")} />
          </InsetGroup>
        </Reveal>

        <Reveal index={6}>
          <h2 className="mb-3 px-1 text-[20px] font-bold tracking-[-0.4px] text-foreground">{t("seatsHeading")}</h2>
          <BillingClient />
        </Reveal>

        <Reveal index={7}>
          <InsetGroup header={t("paymentHistory")}>
            {orders.length === 0 && payments.length === 0 ? (
              <p className="px-4 py-8 text-center text-[14px] text-muted-foreground">{t("noPayments")}</p>
            ) : (
              <>
                {orders.map((o) => (
                  <InsetRow
                    key={o.id}
                    icon={o.kind === "ADD_PROGRAM" ? FolderKanban : Receipt}
                    tone={statusTone(o.status)}
                    title={tHome(`kind.${o.kind === "ADD_PROGRAM" ? "ADD_PROGRAM" : "NEW_TENANT"}`)}
                    subtitle={`${date.format(o.createdAt)} · ${tHome(`status.${o.status === "PAID" || o.status === "FAILED" ? o.status : "PENDING"}`)}`}
                    value={<span className="tabular-nums">{formatKurus(o.total, o.currency, intl)}</span>}
                  />
                ))}
                {payments.map((p) => (
                  <InsetRow
                    key={p.id}
                    icon={Users}
                    tone={statusTone(p.status)}
                    title={`${p.seatCount} ${t("seatsUnit")} · ${t.has(`types.${p.paymentType}`) ? t(`types.${p.paymentType}`) : p.paymentType}`}
                    subtitle={`${date.format(p.createdAt)} · ${t.has(`statuses.${p.status}`) ? t(`statuses.${p.status}`) : p.status}`}
                    value={
                      <span className="tabular-nums">
                        {new Intl.NumberFormat(intl, { style: "currency", currency: p.currency }).format(p.amount)}
                      </span>
                    }
                  />
                ))}
              </>
            )}
          </InsetGroup>
        </Reveal>
      </div>
    </DashboardLayout>
  );
}
