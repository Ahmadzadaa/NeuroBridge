"use client";

import { useTranslations } from "next-intl";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Link } from "@/i18n/navigation";
import { Plus, Eye, Pencil, Download } from "lucide-react";

interface ProgramsPageClientProps {
  userName: string;
}

export function ProgramsPageClient({ userName }: ProgramsPageClientProps) {
  const t = useTranslations("tenant.programs");
  const tp = useTranslations("tenant.projectTypes");
  const tc = useTranslations("common");

  return (
    <DashboardLayout panel="tenant" title={t("title")} userName={userName}>
      <Card className="rounded-2xl border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t("title")}</CardTitle>
          <Link href="/tenant/programs/new">
            <Button className="rounded-xl">
              <Plus className="mr-2 h-4 w-4" />
              {t("create")}
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("name")}</TableHead>
                <TableHead>{t("type")}</TableHead>
                <TableHead>{t("participants")}</TableHead>
                <TableHead>{tc("active")}</TableHead>
                <TableHead>{tc("inactive")}</TableHead>
                <TableHead>{t("start")}</TableHead>
                <TableHead>{t("end")}</TableHead>
                <TableHead>{tc("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  {tc("noData")}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
