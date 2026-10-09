"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, ChevronLeft, ChevronRight, Download, ExternalLink, FileText, Medal, MessageSquarePlus } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { useApiErrorMessage } from "@/lib/api/api-error";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScoreInput } from "@/components/jury/score-input";
import { AvatarStack } from "@/components/jury/avatar-stack";
import { cn } from "@/lib/utils";

type Criterion = { id: string; label: string; maxScore: number; weight: number };

export interface ScoreSubmissionClientProps {
  submission: {
    id: string;
    title: string;
    summary: string | null;
    fileName: string;
    version: number;
    teamName: string;
    slogan: string | null;
    programName: string;
    members: { userId: string; name: string; hasAvatar: boolean }[];
  };
  criteria: Criterion[];
  initialScores: Record<string, number>;
  initialComments: Record<string, string>;
  nav: { position: number; total: number; prevId: string | null; nextId: string | null; nextPendingId: string | null };
}

const SURFACE =
  "rounded-[22px] bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)] ring-1 ring-border/60";

export function ScoreSubmissionClient({ submission, criteria, initialScores, initialComments, nav }: ScoreSubmissionClientProps) {
  const t = useTranslations("hackathon.jury");
  const tc = useTranslations("common");
  const apiError = useApiErrorMessage();
  const router = useRouter();
  const [scores, setScores] = useState<Record<string, number>>(initialScores);
  const [comments, setComments] = useState<Record<string, string>>(initialComments);
  const [openComments, setOpenComments] = useState<Set<string>>(() => new Set(Object.keys(initialComments)));
  const [saving, setSaving] = useState<"stay" | "next" | null>(null);

  const fileUrl = `/api/hackathon/submissions/${submission.id}/file`;
  const scoredCount = criteria.filter((c) => scores[c.id] !== undefined).length;
  const complete = criteria.length > 0 && scoredCount === criteria.length;
  const alreadyScored = criteria.length > 0 && criteria.every((c) => initialScores[c.id] !== undefined);
  const totalWeight = criteria.reduce((n, c) => n + c.weight, 0);
  // Same weighted 0–100 scale the live ranking uses.
  const preview = complete
    ? Math.round((criteria.reduce((n, c) => n + (scores[c.id] / c.maxScore) * c.weight, 0) / totalWeight) * 1000) / 10
    : null;
  const nextTarget = nav.nextPendingId && nav.nextPendingId !== submission.id ? nav.nextPendingId : null;

  async function save(then: "stay" | "next") {
    if (!complete || saving) return;
    setSaving(then);
    try {
      const res = await fetch(`/api/hackathon/submissions/${submission.id}/scores`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scores: criteria.map((c) => ({ criterionId: c.id, score: scores[c.id], comment: comments[c.id]?.trim() || undefined })),
        }),
      });
      if (!res.ok) {
        toast.error(apiError(await res.json().catch(() => null)));
        return;
      }
      toast.success(t("scoresSaved"));
      if (then === "next") router.push(nextTarget ? `/jury/submissions/${nextTarget}` : "/jury");
      else router.refresh();
    } catch {
      toast.error(tc("error"));
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-28 lg:pb-0">
      <div className="flex items-center justify-between gap-3">
        <Link href="/jury" className="inline-flex items-center gap-1 text-[14px] font-medium text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {t("backToDashboard")}
        </Link>
        {nav.position > 0 && nav.total > 1 && (
          <nav aria-label={t("submissionNav")} className="flex items-center gap-1">
            <NavArrow href={nav.prevId && `/jury/submissions/${nav.prevId}`} label={t("previous")} icon={ChevronLeft} />
            <span className="px-1.5 text-[13px] font-medium tabular-nums text-muted-foreground">
              {t("position", { n: nav.position, total: nav.total })}
            </span>
            <NavArrow href={nav.nextId && `/jury/submissions/${nav.nextId}`} label={t("next")} icon={ChevronRight} />
          </nav>
        )}
      </div>

      {/* Team card */}
      <section className="ios-reveal relative overflow-hidden rounded-[26px] bg-gradient-to-br from-sky-600 via-indigo-600 to-violet-600 p-6 text-white shadow-[0_20px_50px_-24px_rgba(79,70,229,0.7)] sm:p-8">
        <span aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/15 blur-3xl" />
        <div className="relative flex flex-wrap items-end gap-5">
          <div className="min-w-0 flex-1 basis-full md:basis-0">
            <p className="text-[13px] font-semibold uppercase tracking-[0.6px] text-white/70">{submission.programName}</p>
            <h1 className="mt-1 text-[24px] font-bold leading-tight tracking-[-0.6px] sm:text-[30px]">{submission.title}</h1>
            <p className="mt-1 text-[15px] font-medium text-white/90">
              {submission.teamName}
              {submission.slogan && <span className="font-normal text-white/70"> · {submission.slogan}</span>}
            </p>
            {submission.members.length > 0 && (
              <div className="mt-4 flex items-center gap-3">
                <AvatarStack members={submission.members} max={5} ringClassName="ring-white/40" />
                <span className="truncate text-[13px] text-white/80">{submission.members.map((m) => m.name).join(", ")}</span>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <span className="rounded-2xl bg-white/15 px-4 py-2 text-center ring-1 ring-white/25 backdrop-blur">
              <span className="block text-[20px] font-bold tabular-nums">v{submission.version}</span>
              <span className="block text-[11px] text-white/75">{t("version")}</span>
            </span>
            <span className="rounded-2xl bg-white/15 px-4 py-2 text-center ring-1 ring-white/25 backdrop-blur">
              <span className="block text-[20px] font-bold tabular-nums">{preview ?? "—"}</span>
              <span className="block text-[11px] text-white/75">{t("yourScore")}</span>
            </span>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start">
        {/* Document */}
        <section className={cn(SURFACE, "overflow-hidden")} aria-labelledby="document-heading">
          <div className="flex flex-wrap items-center gap-3 border-b border-border/60 px-4 py-3.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-gradient-to-br from-rose-400 to-red-600 text-white">
              <FileText className="h-4.5 w-4.5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 id="document-heading" className="truncate text-[15px] font-semibold">{t("document")}</h2>
              <p className="truncate text-[12px] text-muted-foreground">{submission.fileName}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" nativeButton={false} render={<a href={fileUrl} download={submission.fileName} />}>
                <Download className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only sm:not-sr-only">{t("download")}</span>
              </Button>
              <Button variant="outline" size="sm" nativeButton={false} render={<a href={fileUrl} target="_blank" rel="noreferrer" />}>
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                {t("openPdf")}
              </Button>
            </div>
          </div>
          {submission.summary && (
            <div className="border-b border-border/60 bg-muted/30 px-4 py-3.5">
              <p className="text-[12px] font-semibold uppercase tracking-[0.4px] text-muted-foreground">{t("summary")}</p>
              <p className="mt-1 whitespace-pre-wrap text-[14px] leading-relaxed text-foreground/90">{submission.summary}</p>
            </div>
          )}
          <iframe src={fileUrl} title={submission.fileName} className="hidden h-[70vh] w-full bg-muted sm:block lg:h-[75vh]" />
        </section>

        {/* Sheet */}
        <section className={cn(SURFACE, "space-y-5 p-5 lg:sticky lg:top-24")} aria-labelledby="sheet-heading">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id="sheet-heading" className="text-[20px] font-bold tracking-[-0.4px]">{t("scoringHeading")}</h2>
              <p className="text-[13px] text-muted-foreground">{t("scoredProgress", { scored: scoredCount, total: criteria.length })}</p>
            </div>
            {alreadyScored ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-success/12 px-2.5 py-1 text-[12px] font-semibold text-success">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                {t("scored")}
              </span>
            ) : (
              preview !== null && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[13px] font-bold tabular-nums text-primary">
                  <Medal className="h-3.5 w-3.5" aria-hidden="true" />
                  {preview}
                </span>
              )
            )}
          </div>

          <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-300"
              style={{ width: `${criteria.length ? (scoredCount / criteria.length) * 100 : 0}%` }}
            />
          </div>

          {criteria.length === 0 && <p className="text-[14px] text-muted-foreground">{t("noCriteria")}</p>}

          {criteria.map((c, i) => {
            const commentOpen = openComments.has(c.id);
            return (
              <div key={c.id} className="space-y-2">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-[14px] font-semibold">
                    <span className="mr-1.5 text-muted-foreground">{i + 1}.</span>
                    {c.label}
                  </p>
                  <span className="shrink-0 text-[12px] tabular-nums text-muted-foreground">
                    {scores[c.id] ?? "—"} / {c.maxScore}
                    {c.weight > 1 && ` · ×${c.weight}`}
                  </span>
                </div>
                <ScoreInput label={c.label} maxScore={c.maxScore} value={scores[c.id]} onChange={(v) => setScores((prev) => ({ ...prev, [c.id]: v }))} />
                {commentOpen ? (
                  <Textarea
                    aria-label={t("commentFor", { criterion: c.label })}
                    value={comments[c.id] ?? ""}
                    maxLength={500}
                    rows={2}
                    autoFocus={!initialComments[c.id]}
                    onChange={(e) => setComments((prev) => ({ ...prev, [c.id]: e.target.value }))}
                    placeholder={t("commentPlaceholder")}
                    className="min-h-14 rounded-xl text-[13px]"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setOpenComments((prev) => new Set(prev).add(c.id))}
                    className="inline-flex items-center gap-1 text-[12px] font-medium text-primary hover:underline"
                  >
                    <MessageSquarePlus className="h-3.5 w-3.5" aria-hidden="true" />
                    {t("addComment")}
                  </button>
                )}
              </div>
            );
          })}

          <p className="text-[12px] text-muted-foreground">{t("scoringHint")}</p>

          <div className="fixed inset-x-0 bottom-[72px] z-20 flex gap-2 border-t border-border/60 bg-background/85 p-3 backdrop-blur-xl lg:static lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
            <Button variant="outline" className="flex-1" disabled={saving !== null || !complete} onClick={() => save("stay")}>
              {saving === "stay" ? t("saving") : t("saveScores")}
            </Button>
            <Button className="flex-1" disabled={saving !== null || !complete} onClick={() => save("next")}>
              {saving === "next" ? t("saving") : nextTarget ? t("saveAndNext") : t("saveAndFinish")}
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}

function NavArrow({ href, label, icon: Icon }: { href: string | null; label: string; icon: typeof ChevronLeft }) {
  const cls = "flex h-9 w-9 items-center justify-center rounded-full bg-card ring-1 ring-border/60 transition-colors";
  if (!href) {
    return (
      <span className={cn(cls, "text-muted-foreground/40")} aria-disabled="true">
        <Icon className="h-4 w-4" aria-hidden="true" />
        <span className="sr-only">{label}</span>
      </span>
    );
  }
  return (
    <Link href={href} className={cn(cls, "text-foreground hover:bg-muted")}>
      <Icon className="h-4 w-4" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </Link>
  );
}
