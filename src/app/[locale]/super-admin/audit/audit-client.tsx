"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { LargeTitle } from "@/components/ui/ios";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AUDIT_ACTIONS } from "@/lib/audit/actions";

interface AuditItem {
  id: string;
  action: string;
  userId: string | null;
  tenantId: string | null;
  ip: string | null;
  details: string | null;
  createdAt: string;
  userEmail: string | null;
  userName: string | null;
  tenantName: string | null;
}

interface AuditClientProps {
  userName: string;
  title: string;
}

export function AuditClient({ userName, title }: AuditClientProps) {
  const t = useTranslations("superAdmin.audit");
  const tPage = useTranslations("superAdmin.pages");
  const tc = useTranslations("common");
  const [items, setItems] = useState<AuditItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [action, setAction] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  // The spinner is turned on by whichever control changed the query, so this
  // effect only writes state once the response is in.
  useEffect(() => {
    let cancelled = false;

    const params = new URLSearchParams({ page: String(page), pageSize: "25" });
    if (action !== "all") params.set("action", action);

    fetch(`/api/audit?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (data) {
          setItems(data.items);
          setTotal(data.total);
        }
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [page, action]);

  function changePage(next: number) {
    setLoading(true);
    setPage(next);
  }

  function changeAction(next: string) {
    setLoading(true);
    setAction(next);
    setPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(total / 25));

  return (
    <DashboardLayout panel="super-admin" title={title} userName={userName}>
      <LargeTitle className="mb-6" title={title} subtitle={tPage("auditSubtitle")} />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Select value={action} onValueChange={(v) => changeAction(v ?? "all")}>
          <SelectTrigger className="w-56 rounded-xl">
            {/* Action names double as their own labels, but the "all" option
                would otherwise render the literal word "all". */}
            <SelectValue>
              {(value: string) =>
                !value || value === "all" ? t("allActions") : value
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allActions")}</SelectItem>
            {Object.values(AUDIT_ACTIONS).map((value) => (
              <SelectItem key={value} value={value}>
                {value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          className="max-w-xs rounded-xl"
          placeholder={t("searchDetails")}
          disabled
        />
      </div>

      <div className="rounded-2xl border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("timestamp")}</TableHead>
              <TableHead>{t("action")}</TableHead>
              <TableHead>{t("user")}</TableHead>
              <TableHead>{t("tenant")}</TableHead>
              <TableHead>{t("ip")}</TableHead>
              <TableHead>{t("details")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center text-muted-foreground"
                >
                  {tc("loading")}
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center text-muted-foreground"
                >
                  {t("empty")}
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="whitespace-nowrap text-xs">
                    {new Date(item.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {item.action}
                  </TableCell>
                  <TableCell className="text-xs">
                    {item.userName || item.userEmail || item.userId || "—"}
                  </TableCell>
                  <TableCell className="text-xs">
                    {item.tenantName || item.tenantId || "—"}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {item.ip || "—"}
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-xs text-muted-foreground">
                    {item.details || "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {t("totalEntries", { count: total })}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="rounded-xl"
            disabled={page <= 1}
            onClick={() => changePage(page - 1)}
          >
            {tc("previous")}
          </Button>
          <Button
            variant="outline"
            className="rounded-xl"
            disabled={page >= totalPages}
            onClick={() => changePage(page + 1)}
          >
            {tc("next")}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
