import { setRequestLocale } from "next-intl/server";
import { requireRole } from "@/lib/auth-utils";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { getTranslations } from "next-intl/server";
import { BillingClient } from "./billing-client";
import { listTenantPayments } from "@/lib/payment/payment-service";
import { getTenantSeatSnapshot } from "@/lib/seats/seat-service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function TenantBillingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireRole(locale, ["TENANT_ADMIN"]);
  const t = await getTranslations("tenant.seats");

  const tenantId = session.user.tenantId!;
  const [seats, payments] = await Promise.all([
    getTenantSeatSnapshot(tenantId),
    listTenantPayments(tenantId),
  ]);

  return (
    <DashboardLayout panel="tenant" title={t("total")} userName={session.user.name ?? "Admin"}>
      <Card className="mb-6 rounded-2xl border-0 shadow-sm">
        <CardHeader>
          <CardTitle>{t("total")}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {t("used")}: {seats?.seatsUsed ?? 0} · {t("remaining")}:{" "}
          {(seats?.seatLimit ?? 0) - (seats?.seatsUsed ?? 0)} · Limit:{" "}
          {seats?.seatLimit ?? 0}
        </CardContent>
      </Card>

      <BillingClient defaultProvider="STRIPE" />

      <Card className="mt-6 rounded-2xl border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Payment history</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payments yet.</p>
          ) : (
            payments.map((payment) => (
              <div
                key={payment.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-muted/50 p-3 text-sm"
              >
                <span>
                  {payment.seatCount} seats · {payment.provider} · {payment.paymentType}
                </span>
                <span>
                  {payment.status} · ₺{payment.amount}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
