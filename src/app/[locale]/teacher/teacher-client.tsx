"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import QRCode from "qrcode";
import {
  ClipboardCheck,
  Copy,
  Download,
  FileText,
  QrCode,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/ui/stat-card";
import { cn } from "@/lib/utils";

interface StudentRow {
  id: string;
  name: string;
  email: string;
  joinedAt: string;
  lastRun: {
    score: number;
    teacherGrade: number | null;
    teacherMaxGrade: number | null;
  } | null;
}

interface TeacherDashboardClientProps {
  locale: string;
  userName: string;
  inviteToken: string;
  scenarioCount: number;
  pendingGrades: number;
  students: StudentRow[];
}

export function TeacherDashboardClient({
  locale,
  userName,
  inviteToken,
  scenarioCount,
  pendingGrades,
  students,
}: TeacherDashboardClientProps) {
  const t = useTranslations("teacher.dashboard");
  const tc = useTranslations("common");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState("");

  useEffect(() => {
    const url = `${window.location.origin}/${locale}/join/${inviteToken}`;
    setInviteUrl(url);
    QRCode.toDataURL(url, {
      width: 480,
      margin: 2,
      color: { dark: "#0f172a", light: "#ffffff" },
    })
      .then(setQrDataUrl)
      .catch(() => null);
  }, [locale, inviteToken]);

  return (
    <DashboardLayout panel="teacher" title={t("title")} userName={userName}>
      {/* ── Stats ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard title={t("stats.students")} value={students.length} icon={Users} />
        <StatCard title={t("stats.scenarios")} value={scenarioCount} icon={FileText} />
        <StatCard
          title={t("stats.pendingGrades")}
          value={pendingGrades}
          icon={ClipboardCheck}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[380px_1fr]">
        {/* ── Invite card ─────────────────────────────────────── */}
        <div className="self-start rounded-2xl bg-card p-6 shadow-sm">
          <h3 className="flex items-center gap-2 text-[15px] font-semibold">
            <QrCode className="h-4.5 w-4.5 text-primary" aria-hidden="true" />
            {t("invite.heading")}
          </h3>
          <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
            {t("invite.hint")}
          </p>
          <div className="mt-4 flex flex-col items-center gap-3">
            {qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrDataUrl}
                alt={t("invite.qrAlt")}
                className="h-48 w-48 rounded-2xl border border-border p-2"
              />
            ) : (
              <div className="h-48 w-48 animate-pulse rounded-2xl bg-subtle" />
            )}
            <p className="max-w-full break-all text-center text-[11px] text-muted-foreground">
              {inviteUrl}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-lg"
                onClick={() => {
                  navigator.clipboard.writeText(inviteUrl);
                  toast.success(t("invite.copied"));
                }}
              >
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                {t("invite.copy")}
              </Button>
              <Button
                size="sm"
                className="rounded-lg"
                disabled={!qrDataUrl}
                onClick={() => {
                  if (!qrDataUrl) return;
                  const a = document.createElement("a");
                  a.href = qrDataUrl;
                  a.download = "telebe-devet-qr.png";
                  a.click();
                }}
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                PNG
              </Button>
            </div>
          </div>
        </div>

        {/* ── Students ────────────────────────────────────────── */}
        <div className="min-w-0">
          <h3 className="mb-3 text-[15px] font-semibold">
            {t("students.heading")} ({students.length})
          </h3>
          {students.length === 0 ? (
            <div className="rounded-2xl bg-card shadow-sm">
              <EmptyState
                title={tc("noData")}
                description={t("students.empty")}
              />
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl bg-card shadow-sm">
              <div className="flex items-center gap-4 border-b border-border px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">
                <span className="flex-1">{t("students.name")}</span>
                <span className="w-24 text-right">{t("students.simScore")}</span>
                <span className="w-20 text-right">{t("students.grade")}</span>
              </div>
              {students.map((student) => (
                <div
                  key={student.id}
                  className="flex items-center gap-4 border-b border-border/60 px-4 py-3 text-[13px] last:border-0"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                    {student.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">
                      {student.name}
                    </span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {student.email}
                    </span>
                  </span>
                  <span className="w-24 text-right tabular-nums">
                    {student.lastRun ? (
                      <span
                        className={cn(
                          "font-bold",
                          student.lastRun.score >= 70
                            ? "text-success"
                            : "text-warning-dark"
                        )}
                      >
                        {student.lastRun.score}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </span>
                  <span className="w-20 text-right text-[12px] font-semibold tabular-nums">
                    {student.lastRun?.teacherGrade !== null &&
                    student.lastRun?.teacherGrade !== undefined ? (
                      <span className="text-primary">
                        {student.lastRun.teacherGrade}/
                        {student.lastRun.teacherMaxGrade}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
