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
import { IconTile, LargeTitle } from "@/components/ui/ios";
import { Link } from "@/i18n/navigation";
import {
  Plus,
  QrCode,
  Copy,
  Download,
  Users,
  Trophy,
  ChevronRight,
  CalendarDays,
  FolderKanban,
  CircleDashed,
  Scale,
} from "lucide-react";
import { formatDate } from "@/lib/format-date";

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

  // tr-TR for az: Node and browsers format az dates differently, which breaks hydration.
  const dateFmt = { format: (value: Date | string) => formatDate(value, locale, "medium") };

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
      <div className="space-y-6">
        <LargeTitle
          title={t("title")}
          subtitle={t("subtitle")}
          actions={
            <Link href="/tenant/programs/buy">
              <Button size="lg">
                <Plus className="h-4 w-4" aria-hidden="true" />
                {t("buy")}
              </Button>
            </Link>
          }
        />

        {programs.length === 0 ? (
          <div className="rounded-[22px] bg-card ring-1 ring-border/60">
            <EmptyState title={tc("noData")} />
          </div>
        ) : (
          <ul className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2">
            {programs.map((program, i) => {
              const pct = program.participantLimit
                ? Math.min(100, Math.round((program.participantCount / program.participantLimit) * 100))
                : 0;
              return (
                <li
                  key={program.id}
                  style={{ "--i": i + 1 } as React.CSSProperties}
                  className="ios-reveal flex flex-col rounded-[22px] bg-card p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)] ring-1 ring-border/60"
                >
                  <div className="flex items-start gap-3">
                    <IconTile
                      icon={program.pendingSetup ? CircleDashed : program.type === "hackathon" ? Trophy : FolderKanban}
                      tone={program.pendingSetup ? "slate" : program.type === "hackathon" ? "amber" : "indigo"}
                    />
                    <div className="min-w-0 flex-1">
                      <h2 className="text-[17px] font-semibold leading-snug tracking-[-0.3px] text-foreground">{program.name}</h2>
                      <p className="mt-0.5 text-[13px] text-muted-foreground">
                        {tp.has(program.type) ? tp(program.type) : program.type}
                      </p>
                    </div>
                    {program.pendingSetup && (
                      <span className="shrink-0 rounded-full bg-warning/15 px-2.5 py-0.5 text-[11px] font-semibold text-warning-dark">
                        {t("statusPending")}
                      </span>
                    )}
                  </div>

                  {program.pendingSetup ? (
                    <p className="mt-4 rounded-2xl bg-muted/60 px-4 py-3 text-[13px] leading-relaxed text-muted-foreground">
                      {t("pendingHint")}
                    </p>
                  ) : (
                    <div className="mt-5 space-y-3">
                      <div>
                        <div className="flex items-center justify-between text-[13px]">
                          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                            <Users className="h-3.5 w-3.5" aria-hidden="true" />
                            {t("participants")}
                          </span>
                          <span className="font-semibold tabular-nums text-foreground">
                            {program.participantCount} / {program.participantLimit}
                          </span>
                        </div>
                        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={t("participants")}>
                          <div className="bar-fill h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                      <p className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground">
                        <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                        {t("applicationWindow")}: {dateFmt.format(new Date(program.applicationStart))} – {dateFmt.format(new Date(program.applicationEnd))}
                      </p>
                    </div>
                  )}

                  <div className="mt-5 flex flex-wrap gap-2 border-t border-border/60 pt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={program.pendingSetup}
                      onClick={() => setQrProgram(program)}
                    >
                      <QrCode className="h-4 w-4" aria-hidden="true" />
                      {tq("invite")}
                    </Button>
                    {program.type !== "hackathon" && !program.pendingSetup && (
                      <Link href={`/tenant/programs/${program.id}/jury`}>
                        <Button variant="outline" size="sm">
                          <Scale className="h-4 w-4" aria-hidden="true" />
                          {t("jury")}
                          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                        </Button>
                      </Link>
                    )}
                    {program.type === "hackathon" && !program.pendingSetup && (
                      <Link href={`/tenant/programs/${program.id}/hackathon`}>
                        <Button variant="outline" size="sm">
                          <Trophy className="h-4 w-4" aria-hidden="true" />
                          {tq("hackathon")}
                          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                        </Button>
                      </Link>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
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
