"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { LargeTitle } from "@/components/ui/ios";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusChip, type StatusChipVariant } from "@/components/ui/status-chip";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatKurus } from "@/lib/billing/money";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/billing/order-status";
import { cn } from "@/lib/utils";

export type OrderRow = {
  id: string;
  institutionName: string;
  contactName: string;
  contactEmail: string;
  status: OrderStatus;
  total: number;
  currency: string;
  createdAt: string;
  tenantName: string | null;
  activated: boolean;
  items: { code: string; participantCount: number }[];
};

const STATUS_VARIANT: Record<OrderStatus, StatusChipVariant> = {
  PENDING: "pending",
  PAID: "passed",
  FAILED: "failed",
};

export function OrdersClient({
  locale,
  userName,
  orders,
  filter,
  counts,
}: {
  locale: string;
  userName: string;
  orders: OrderRow[];
  filter: OrderStatus | null;
  counts: Record<string, number>;
}) {
  const t = useTranslations("superAdmin.orders");
  const tc = useTranslations("common");
  const router = useRouter();
  const [resending, setResending] = useState<string | null>(null);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  async function resend(order: OrderRow) {
    setResending(order.id);
    try {
      const res = await fetch(`/api/orders/${order.id}/resend-activation`, { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.code === "ALREADY_ACTIVATED" ? t("alreadyActivated") : (data?.error ?? tc("error")));
        return;
      }
      if (data?.emailSent) toast.success(t("resent", { email: order.contactEmail }));
      else toast.error(t("resendNotEmailed"));
      router.refresh();
    } catch {
      toast.error(tc("error"));
    } finally {
      setResending(null);
    }
  }

  const tabs: { key: OrderStatus | null; label: string; count: number }[] = [
    { key: null, label: t("all"), count: total },
    ...ORDER_STATUSES.map((s) => ({ key: s, label: t(`status.${s}`), count: counts[s] ?? 0 })),
  ];

  return (
    <DashboardLayout panel="super-admin" title={t("title")} userName={userName}>
      <LargeTitle className="mb-6" title={t("title")} subtitle={t("subtitle")} />
      <div className="overflow-hidden rounded-[22px] bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)] ring-1 ring-border/60">
        <div className="border-b border-border/60 px-5 py-4">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <Link
                key={tab.key ?? "all"}
                href={tab.key ? `/super-admin/billing?status=${tab.key}` : "/super-admin/billing"}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors",
                  filter === tab.key
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label} · {tab.count}
              </Link>
            ))}
          </div>
        </div>

        {orders.length === 0 ? (
          <EmptyState title={tc("noData")} />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("institution")}</TableHead>
                  <TableHead>{t("services")}</TableHead>
                  <TableHead className="text-right">{t("total")}</TableHead>
                  <TableHead>{t("statusLabel")}</TableHead>
                  <TableHead>{t("createdAt")}</TableHead>
                  <TableHead className="text-right">{tc("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <span className="block font-medium">{order.institutionName}</span>
                      <span className="block text-[11px] text-muted-foreground">
                        {order.contactName} · {order.contactEmail}
                      </span>
                    </TableCell>
                    <TableCell className="text-[12px] text-muted-foreground">
                      {order.items.map((i) => `${i.code} × ${i.participantCount}`).join(", ")}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatKurus(order.total, order.currency, "tr-TR")}
                    </TableCell>
                    <TableCell>
                      <StatusChip variant={STATUS_VARIANT[order.status] ?? "pending"}>
                        {t(`status.${order.status}`)}
                      </StatusChip>
                      {order.status === "PAID" && (
                        <span className="mt-1 block text-[11px] text-muted-foreground">
                          {order.activated ? t("adminActivated") : t("adminNotActivated")}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(order.createdAt).toLocaleString(locale)}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        {order.status === "PAID" && !order.activated && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-lg"
                            disabled={resending === order.id}
                            onClick={() => resend(order)}
                          >
                            {resending === order.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                            ) : (
                              <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                            )}
                            {t("resendActivation")}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
