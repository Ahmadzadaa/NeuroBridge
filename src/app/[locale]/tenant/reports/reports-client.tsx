"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, Gamepad2, GraduationCap, Award, FileText, Download } from "lucide-react";
import { toast } from "sonner";

interface ProgramOption {
  id: string;
  name: string;
}

interface ReportsPageClientProps {
  userName: string;
  programs: ProgramOption[];
}

export function ReportsPageClient({ userName, programs }: ReportsPageClientProps) {
  const t = useTranslations("tenant.reports");
  const tc = useTranslations("common");
  const [selectedProgram, setSelectedProgram] = useState(programs[0]?.id ?? "");
  const [exporting, setExporting] = useState(false);

  async function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function pollExportJob(jobId: string): Promise<void> {
    const maxAttempts = 60;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const statusRes = await fetch(`/api/jobs/${jobId}`);
      if (!statusRes.ok) {
        const data = await statusRes.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to check export status");
      }

      const status = await statusRes.json();
      if (status.status === "FAILED") {
        throw new Error(status.error ?? "Export failed");
      }

      if (status.status === "COMPLETED" && status.downloadUrl) {
        const downloadRes = await fetch(status.downloadUrl);
        if (!downloadRes.ok) {
          throw new Error("Failed to download export");
        }
        const blob = await downloadRes.blob();
        await downloadBlob(blob, status.filename ?? "report.csv");
        return;
      }
    }

    throw new Error("Export timed out. Try again later.");
  }

  async function exportReport(format: "csv" | "pdf") {
    if (!selectedProgram) {
      toast.error(t("selectProgram"));
      return;
    }

    setExporting(true);
    try {
      const res = await fetch("/api/reports/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          programId: selectedProgram,
          format,
          reportType: "general",
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Export failed");
        return;
      }

      if (res.status === 202) {
        const data = await res.json();
        toast.message("Large export queued — preparing file…");
        await pollExportJob(data.jobId);
        toast.success("Report exported");
        return;
      }

      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition");
      const filenameMatch = disposition?.match(/filename="(.+)"/);
      const filename = filenameMatch?.[1] ?? `report.${format}`;
      await downloadBlob(blob, filename);
      toast.success("Report exported");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Export failed");
    } finally {
      setExporting(false);
    }
  }

  return (
    <DashboardLayout panel="tenant" title={t("title")} userName={userName}>
      <div className="mb-6">
        <Select value={selectedProgram} onValueChange={(v) => setSelectedProgram(v ?? "")}>
          <SelectTrigger className="w-full max-w-sm rounded-xl">
            <SelectValue placeholder={t("selectProgram")} />
          </SelectTrigger>
          <SelectContent>
            {programs.length === 0 ? (
              <SelectItem value="none" disabled>
                No programs
              </SelectItem>
            ) : (
              programs.map((program) => (
                <SelectItem key={program.id} value={program.id}>
                  {program.name}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard title={t("kpi.totalParticipants")} value={0} icon={Users} />
        <StatCard title={t("kpi.simulationCompletion")} value="0%" icon={Gamepad2} />
        <StatCard title={t("kpi.trainingCompletion")} value="0%" icon={GraduationCap} />
        <StatCard title={t("kpi.averageTestScore")} value="—" icon={Award} />
        <StatCard title={t("kpi.badgesAwarded")} value={0} icon={Award} />
        <StatCard title={t("kpi.certificatesEarned")} value={0} icon={FileText} />
      </div>

      <Card className="rounded-2xl border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t("title")}</CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl"
              disabled={exporting || !selectedProgram}
              onClick={() => exportReport("csv")}
            >
              <Download className="mr-2 h-4 w-4" />
              {t("exportExcel")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl"
              disabled={exporting || !selectedProgram}
              onClick={() => exportReport("pdf")}
            >
              {t("exportPdf")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="general">
            <TabsList className="rounded-xl">
              <TabsTrigger value="general">{t("general")}</TabsTrigger>
              <TabsTrigger value="training">{t("training")}</TabsTrigger>
              <TabsTrigger value="test">{t("test")}</TabsTrigger>
              <TabsTrigger value="certificate">{t("certificate")}</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{tc("status")}</TableHead>
                    <TableHead>{t("columns.simulationCompletion")}</TableHead>
                    <TableHead>{t("columns.trainingCompletion")}</TableHead>
                    <TableHead>{t("columns.badgesEarned")}</TableHead>
                    <TableHead>{t("columns.certStatus")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      {tc("noData")}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="training" className="mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("columns.assignedTrainings")}</TableHead>
                    <TableHead>{t("columns.completedTrainings")}</TableHead>
                    <TableHead>{t("columns.completionRate")}</TableHead>
                    <TableHead>{t("columns.trainingsTaken")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      {tc("noData")}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="test" className="mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("columns.trainingModule")}</TableHead>
                    <TableHead>{t("columns.averageScore")}</TableHead>
                    <TableHead>{t("columns.highestScore")}</TableHead>
                    <TableHead>{t("columns.result")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      {tc("noData")}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="certificate" className="mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("columns.certificatesEarned")}</TableHead>
                    <TableHead>{t("columns.totalCertificates")}</TableHead>
                    <TableHead>{t("columns.lastCertificateDate")}</TableHead>
                    <TableHead>{tc("actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      {tc("noData")}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
