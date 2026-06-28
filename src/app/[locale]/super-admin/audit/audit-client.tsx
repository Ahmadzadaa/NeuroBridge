"use client";

import { useCallback, useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
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
  const [items, setItems] = useState<AuditItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [action, setAction] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: "25" });
    if (action !== "all") params.set("action", action);

    const res = await fetch(`/api/audit?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      setItems(data.items);
      setTotal(data.total);
    }
    setLoading(false);
  }, [page, action]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const totalPages = Math.max(1, Math.ceil(total / 25));

  return (
    <DashboardLayout panel="super-admin" title={title} userName={userName}>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Select value={action} onValueChange={(v) => { setAction(v ?? "all"); setPage(1); }}>
          <SelectTrigger className="w-56 rounded-xl">
            <SelectValue placeholder="Filter by action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All actions</SelectItem>
            {Object.values(AUDIT_ACTIONS).map((value) => (
              <SelectItem key={value} value={value}>
                {value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          className="max-w-xs rounded-xl"
          placeholder="Search in details (client-side)"
          disabled
        />
      </div>

      <div className="rounded-2xl border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Tenant</TableHead>
              <TableHead>IP</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No audit entries found.
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="whitespace-nowrap text-xs">
                    {new Date(item.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{item.action}</TableCell>
                  <TableCell className="text-xs">
                    {item.userName || item.userEmail || item.userId || "—"}
                  </TableCell>
                  <TableCell className="text-xs">{item.tenantName || item.tenantId || "—"}</TableCell>
                  <TableCell className="font-mono text-xs">{item.ip || "—"}</TableCell>
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
        <p className="text-sm text-muted-foreground">{total} total entries</p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="rounded-xl"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            className="rounded-xl"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
