"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { StatusChip, type StatusChipVariant } from "@/components/ui/status-chip";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ProgramOption {
  id: string;
  name: string;
}

interface ParticipantItem {
  id: string;
  status: string;
  registrationDate: string;
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
}

interface ParticipantsPageClientProps {
  userName: string;
  programs: ProgramOption[];
}

const PAGE_SIZE = 25;

export function ParticipantsPageClient({
  userName,
  programs,
}: ParticipantsPageClientProps) {
  const t = useTranslations("tenant.participants");
  const tc = useTranslations("common");
  const [programFilter, setProgramFilter] = useState<string>("all");
  const [items, setItems] = useState<ParticipantItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const loadParticipants = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(PAGE_SIZE),
    });
    if (programFilter !== "all") {
      params.set("programId", programFilter);
    }

    const res = await fetch(`/api/participants?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      setItems(data.items);
      setTotal(data.total);
    }
    setLoading(false);
  }, [page, programFilter]);

  useEffect(() => {
    loadParticipants();
  }, [loadParticipants]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function formatName(user: ParticipantItem["user"]) {
    const name = [user.firstName, user.lastName].filter(Boolean).join(" ");
    return name || user.email;
  }

  function statusChip(status: string) {
    const normalized = status.toLowerCase();
    const variant: StatusChipVariant =
      normalized === "active"
        ? "active"
        : normalized === "inactive"
          ? "inactive"
          : "pending";
    const label =
      normalized === "active"
        ? tc("active")
        : normalized === "inactive"
          ? tc("inactive")
          : normalized === "pending"
            ? tc("pending")
            : status;
    return <StatusChip variant={variant}>{label}</StatusChip>;
  }

  return (
    <DashboardLayout panel="tenant" title={t("title")} userName={userName}>
      <Card className="rounded-2xl border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle>{t("title")}</CardTitle>
          <Select
            value={programFilter}
            onValueChange={(value) => {
              setProgramFilter(value ?? "all");
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full max-w-xs rounded-xl">
              <SelectValue placeholder={t("title")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("allPrograms")}</SelectItem>
              {programs.map((program) => (
                <SelectItem key={program.id} value={program.id}>
                  {program.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("fullName")}</TableHead>
                <TableHead>{t("email")}</TableHead>
                <TableHead>{t("registrationDate")}</TableHead>
                <TableHead>{tc("status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="hover:bg-transparent hover:[&>td:first-child]:shadow-none">
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-44" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                  </TableRow>
                ))
              ) : items.length === 0 ? (
                <TableRow className="even:bg-transparent hover:bg-transparent hover:[&>td:first-child]:shadow-none">
                  <TableCell colSpan={4} className="h-auto whitespace-normal">
                    <EmptyState title={tc("noData")} />
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{formatName(item.user)}</TableCell>
                    <TableCell className="text-muted-foreground">{item.user.email}</TableCell>
                    <TableCell>
                      {new Date(item.registrationDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{statusChip(item.status)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <Pagination
              className="mt-4"
              page={page}
              pageSize={PAGE_SIZE}
              totalItems={total}
              onPageChange={(p) => setPage(p)}
              itemLabel={t("title").toLowerCase()}
            />
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
