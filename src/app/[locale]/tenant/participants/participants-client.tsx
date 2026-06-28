"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="py-8 text-center text-muted-foreground"
                  >
                    {tc("loading")}
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="py-8 text-center text-muted-foreground"
                  >
                    {tc("noData")}
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{formatName(item.user)}</TableCell>
                    <TableCell>{item.user.email}</TableCell>
                    <TableCell>
                      {new Date(item.registrationDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{item.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {total} {t("title").toLowerCase()}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((p) => p - 1)}
                >
                  {tc("back")}
                </Button>
                <span className="flex items-center px-2 text-sm text-muted-foreground">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  disabled={page >= totalPages || loading}
                  onClick={() => setPage((p) => p + 1)}
                >
                  {tc("next")}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
