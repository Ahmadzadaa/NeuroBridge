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
import { Plus } from "lucide-react";

const mockTenants = [
  { id: "1", name: "Demo Teknopark", status: "ACTIVE", seats: "0/50", plan: "50-seat", createdAt: "01.01.2026" },
  { id: "2", name: "İstanbul Üniversitesi", status: "ACTIVE", seats: "85/100", plan: "100-seat", createdAt: "15.02.2026" },
  { id: "3", name: "Baku Innovation Hub", status: "PENDING", seats: "0/250", plan: "250-seat", createdAt: "01.03.2026" },
];

interface TenantsPageClientProps {
  userName: string;
}

export function TenantsPageClient({ userName }: TenantsPageClientProps) {
  const t = useTranslations("superAdmin.tenants");
  const tc = useTranslations("common");

  return (
    <DashboardLayout panel="super-admin" title={t("title")} userName={userName}>
      <Card className="rounded-2xl border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t("title")}</CardTitle>
          <Button className="rounded-xl">
            <Plus className="mr-2 h-4 w-4" />
            {t("createTenant")}
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("name")}</TableHead>
                <TableHead>{t("status")}</TableHead>
                <TableHead>{t("seats")}</TableHead>
                <TableHead>{t("plan")}</TableHead>
                <TableHead>{t("createdAt")}</TableHead>
                <TableHead>{tc("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockTenants.map((tenant) => (
                <TableRow key={tenant.id}>
                  <TableCell className="font-medium">{tenant.name}</TableCell>
                  <TableCell>
                    <Badge variant={tenant.status === "ACTIVE" ? "default" : "secondary"}>
                      {tenant.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{tenant.seats}</TableCell>
                  <TableCell>{tenant.plan}</TableCell>
                  <TableCell>{tenant.createdAt}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm">{tc("view")}</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
