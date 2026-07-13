"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft, CheckCircle2, ExternalLink, Loader2, Save, Users } from "lucide-react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface CriterionInput {
  id: string;
  name: string;
  maxScore: number;
  weight: number;
  existingScore: number | null;
  existingComment: string | null;
}

interface ScoreSubmissionClientProps {
  locale: string;
  userName: string;
  submission: {
    id: string;
    title: string;
    summary: string | null;
    fileName: string;
    version: number;
    teamName: string;
    programName: string;
    members: string[];
  };
  criteria: CriterionInput[];
}

export function ScoreSubmissionClient({
  locale,
  userName,
  submission,
  criteria,
}: ScoreSubmissionClientProps) {
  const t = useTranslations("hackathon.jury");
  const tc = useTranslations("common");
  const router = useRouter();

  const [scores, setScores] = useState<Record<string, number | null>>(() =>
    Object.fromEntries(criteria.map((c) => [c.id, c.existingScore]))
  );
  const [comments, setComments] = useState<Record<string, string>>(() =>
    Object.fromEntries(criteria.map((c) => [c.id, c.existingComment ?? ""]))
  );
  const [saving, setSaving] = useState(false);

  const fileUrl = `/api/hackathon/submissions/${submission.id}/file`;
  const allScored = criteria.every((c) => scores[c.id] !== null);

  async function save() {
    if (!allScored || saving) return;
    setSaving(true);
    try {
      const res = await fetch(
        `/api/hackathon/submissions/${submission.id}/scores`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scores: criteria.map((c) => ({
              criterionId: c.id,
              score: scores[c.id],
              comment: comments[c.id]?.trim() || undefined,
            })),
          }),
        }
      );
      if (!res.ok) throw new Error();
      toast.success(t("scoresSaved"));
      router.refresh();
    } catch {
      toast.error(tc("error"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardLayout panel="jury" title={submission.title} userName={userName}>
      <Link
        href={`/${locale}/jury`}
        className="mb-5 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        {t("backToDashboard")}
      </Link>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_420px]">
        {/* ── PDF viewer ──────────────────────────────────────── */}
        <div className="overflow-hidden rounded-2xl bg-card shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold">
                {submission.title}{" "}
                <span className="text-[12px] font-normal text-muted-foreground">
                  v{submission.version}
                </span>
              </p>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-[12px] text-muted-foreground">
                <span className="font-medium text-foreground/80">
                  {submission.teamName}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" aria-hidden="true" />
                  {submission.members.join(", ")}
                </span>
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="rounded-lg"
              render={<a href={fileUrl} target="_blank" rel="noreferrer" />}
            >
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
              {t("openPdf")}
            </Button>
          </div>
          {submission.summary && (
            <p className="border-b border-border bg-subtle/50 px-5 py-3 text-[13px] leading-relaxed text-muted-foreground">
              {submission.summary}
            </p>
          )}
          <iframe
            src={fileUrl}
            title={submission.fileName}
            className="h-[70vh] w-full bg-muted"
          />
        </div>

        {/* ── Scoring panel ───────────────────────────────────── */}
        <div className="space-y-4 self-start">
          <div className="rounded-2xl bg-card p-5 shadow-sm">
            <h3 className="text-[15px] font-semibold">{t("scoringHeading")}</h3>
            <p className="mt-1 text-[12px] text-muted-foreground">
              {t("scoringHint")}
            </p>

            <div className="mt-5 space-y-6">
              {criteria.map((criterion) => {
                const value = scores[criterion.id];
                return (
                  <div key={criterion.id}>
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-[14px] font-medium">{criterion.name}</p>
                      <p
                        className={cn(
                          "shrink-0 text-[15px] font-bold tabular-nums",
                          value === null
                            ? "text-muted-foreground"
                            : "text-primary"
                        )}
                      >
                        {value ?? "—"} / {criterion.maxScore}
                      </p>
                    </div>

                    <input
                      type="range"
                      min={0}
                      max={criterion.maxScore}
                      step={1}
                      value={value ?? 0}
                      aria-label={criterion.name}
                      onChange={(e) =>
                        setScores((prev) => ({
                          ...prev,
                          [criterion.id]: Number(e.target.value),
                        }))
                      }
                      className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-subtle accent-[var(--primary)]"
                    />
                    <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                      <span>0</span>
                      <span>
                        {t("weightLabel")}: ×{criterion.weight}
                      </span>
                      <span>{criterion.maxScore}</span>
                    </div>

                    <Textarea
                      value={comments[criterion.id]}
                      maxLength={500}
                      onChange={(e) =>
                        setComments((prev) => ({
                          ...prev,
                          [criterion.id]: e.target.value,
                        }))
                      }
                      placeholder={t("commentPlaceholder")}
                      className="mt-2 min-h-14 rounded-xl text-[13px]"
                    />
                  </div>
                );
              })}
            </div>

            <Button
              onClick={save}
              disabled={!allScored || saving}
              className="mt-6 w-full rounded-xl"
              size="lg"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <>
                  <Save className="h-4 w-4" aria-hidden="true" />
                  {t("saveScores")}
                </>
              )}
            </Button>
            {criteria.some((c) => c.existingScore !== null) && (
              <p className="mt-2 flex items-center justify-center gap-1.5 text-center text-[12px] text-success">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                {t("alreadyScored")}
              </p>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
