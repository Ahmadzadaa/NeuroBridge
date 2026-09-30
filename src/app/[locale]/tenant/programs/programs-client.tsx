"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import QRCode from "qrcode";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Link } from "@/i18n/navigation";
import {
  Plus,
  QrCode,
  Copy,
  Download,
  Users,
  Trophy,
  ChevronRight,
} from "lucide-react";

export interface ProgramRow {
  id: string;
  name: string;
  type: string;
  applicationStart: string;
  applicationEnd: string;
  participantLimit: number;
  applicationToken: string;
  participantCount: number;
  teamCount: number;
  /** Paid for, still being built by the platform team: no invite link yet. */
  pendingSetup: boolean;
}

interface ProgramsPageClientProps {
  locale: string;
  userName: string;
  paymentSucceeded?: boolean;
  programs: ProgramRow[];
}

export function ProgramsPageClient({
  locale,
  userName,
  paymentSucceeded,
  programs,
}: ProgramsPageClientProps) {
  const t = useTranslations("tenant.programs");
  const tp = useTranslations("tenant.projectTypes");
  const tc = useTranslations("common");
  const tq = useTranslations("tenant.qrInvite");

  const [qrProgram, setQrProgram] = useState<ProgramRow | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const applyUrl = (token: string) =>
    `${window.location.origin}/${locale}/apply/${token}`;

  // Rendering the QR image is asynchronous work against an external library,
  // so it belongs in an effect. Clearing the previous image happens where the
  // dialog is closed instead, keeping this effect free of synchronous state
  // updates.
  useEffect(() => {
    if (!qrProgram) return;
    let cancelled = false;

    QRCode.toDataURL(applyUrl(qrProgram.applicationToken), {
      width: 560,
      margin: 2,
      color: { dark: "#0f172a", light: "#ffffff" },
    })
      .then((dataUrl) => {
        if (!cancelled) setQrDataUrl(dataUrl);
      })
      .catch(() => {
        if (!cancelled) toast.error(tc("error"));
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qrProgram]);

  function closeQrDialog() {
    setQrProgram(null);
    setQrDataUrl(null);
  }

  async function copyLink() {
    if (!qrProgram) return;
    await navigator.clipboard.writeText(applyUrl(qrProgram.applicationToken));
    toast.success(tq("linkCopied"));
  }

  function downloadQr() {
    if (!qrDataUrl || !qrProgram) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `${qrProgram.name.replace(/\s+/g, "-").toLowerCase()}-qr.png`;
    a.click();
  }

  return (
    <DashboardLayout panel="tenant" title={t("title")} userName={userName}>
      {paymentSucceeded && (
        <p role="status" className="ios-reveal mb-5 rounded-2xl bg-success/10 px-4 py-3 text-[14px] text-foreground ring-1 ring-success/30">
          {t("paymentSuccess")}
        </p>
      )}
      <div className="overflow-hidden rounded-[20px] bg-card shadow-sm ring-1 ring-border/60">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-[15px] font-semibold">{t("title")}</h2>
          <Link href="/tenant/programs/buy">
            <Button>
              <Plus className="h-4 w-4" aria-hidden="true" />
              {t("buy")}
            </Button>
          </Link>
        </div>

        {programs.length === 0 ? (
          <EmptyState title={tc("noData")} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("name")}</TableHead>
                <TableHead>{t("type")}</TableHead>
                <TableHead>{t("participants")}</TableHead>
                <TableHead>{t("start")}</TableHead>
                <TableHead>{t("end")}</TableHead>
                <TableHead className="text-right">{tc("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {programs.map((program) => (
                <TableRow key={program.id} className="group">
                  <TableCell className="font-medium">
                    <span className="flex flex-wrap items-center gap-2">
                      {program.name}
                      {program.pendingSetup && (
                        <span className="rounded-full bg-warning/15 px-2.5 py-0.5 text-[11px] font-semibold text-warning-dark" title={t("pendingHint")}>
                          {t("statusPending")}
                        </span>
                      )}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {tp.has(program.type) ? tp(program.type) : program.type}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5">
                      <Users
                        className="h-3.5 w-3.5 text-muted-foreground"
                        aria-hidden="true"
                      />
                      {program.participantCount} / {program.participantLimit}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {program.pendingSetup ? "—" : new Date(program.applicationStart).toLocaleDateString(locale)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {program.pendingSetup ? "—" : new Date(program.applicationEnd).toLocaleDateString(locale)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-lg"
                        disabled={program.pendingSetup}
                        title={program.pendingSetup ? t("pendingHint") : undefined}
                        onClick={() => setQrProgram(program)}
                      >
                        <QrCode className="h-4 w-4" aria-hidden="true" />
                        {tq("invite")}
                      </Button>
                      {program.type === "hackathon" && (
                        <Link href={`/tenant/programs/${program.id}/hackathon`}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-lg"
                          >
                            <Trophy className="h-4 w-4" aria-hidden="true" />
                            {tq("hackathon")}
                            <ChevronRight
                              className="h-3.5 w-3.5"
                              aria-hidden="true"
                            />
                          </Button>
                        </Link>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* ── QR invite dialog ─────────────────────────────────── */}
      <Dialog
        open={qrProgram !== null}
        onOpenChange={(open) => !open && closeQrDialog()}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{tq("title")}</DialogTitle>
            <DialogDescription>
              {qrProgram?.name} — {tq("description")}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center gap-4 py-2">
            {qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrDataUrl}
                alt={tq("qrAlt")}
                className="h-56 w-56 rounded-2xl border border-border p-2"
              />
            ) : (
              <div className="h-56 w-56 animate-pulse rounded-2xl bg-subtle" />
            )}
            <p className="max-w-[280px] break-all text-center text-[12px] text-muted-foreground">
              {qrProgram && applyUrl(qrProgram.applicationToken)}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" className="rounded-xl" onClick={copyLink}>
                <Copy className="h-4 w-4" aria-hidden="true" />
                {tq("copyLink")}
              </Button>
              <Button className="rounded-xl" onClick={downloadQr}>
                <Download className="h-4 w-4" aria-hidden="true" />
                {tq("downloadPng")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
