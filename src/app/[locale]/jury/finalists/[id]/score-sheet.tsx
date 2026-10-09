"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, ChevronDown, FileText, Medal } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useApiErrorMessage } from "@/lib/api/api-error";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/ui/user-avatar";
import { ScoreInput } from "@/components/jury/score-input";

type Criterion = { id: string; label: string; maxScore: number; weight: number };
type Project = { id: string; order: number; title: string; content: string; updatedAt: string };

export interface ScoreSheetProps {
  finalistId: string;
  finalist: {
    name: string;
    userId: string;
    hasAvatar: boolean;
    details: string[];
    platformScore: number;
    platformRank: number;
  };
  programName: string;
  criteria: Criterion[];
  projects: Project[];
  initialScores: Record<string, number>;
  initialComment: string;
  submitted: boolean;
}

const SURFACE =
  "rounded-[22px] bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)] ring-1 ring-border/60";

export function ScoreSheet(props: ScoreSheetProps) {
  const t = useTranslations("juryScore");
  const tc = useTranslations("common");
  const apiError = useApiErrorMessage();
  const router = useRouter();
  const [scores, setScores] = useState<Record<string, number>>(props.initialScores);
  const [comment, setComment] = useState(props.initialComment);
  const [saving, setSaving] = useState<"draft" | "submit" | null>(null);
  const [openProject, setOpenProject] = useState<string | null>(props.projects.at(-1)?.id ?? null);

  const scoredCount = props.criteria.filter((c) => scores[c.id] !== undefined).length;
  const complete = scoredCount === props.criteria.length;
  const totalWeight = props.criteria.reduce((n, c) => n + c.weight, 0);
  const preview = complete
    ? Math.round((props.criteria.reduce((n, c) => n + (scores[c.id] / c.maxScore) * c.weight, 0) / totalWeight) * 1000) / 10
    : null;

  async function save(submit: boolean) {
    setSaving(submit ? "submit" : "draft");
    try {
      const res = await fetch(`/api/jury/finalists/${props.finalistId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scores, comment, submit }),
      });
      if (!res.ok) {
        toast.error(apiError(await res.json().catch(() => null)));
        return;
      }
      toast.success(submit ? t("submittedToast") : t("draftSaved"));
      router.refresh();
      if (submit) router.push("/jury");
    } catch {
      toast.error(tc("error"));
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-28 lg:pb-0">
      <Link href="/jury" className="inline-flex items-center gap-1 text-[14px] font-medium text-primary hover:underline">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {t("back")}
      </Link>

      {/* Finalist card */}
      <section className="ios-reveal relative overflow-hidden rounded-[26px] bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-6 text-white shadow-[0_20px_50px_-24px_rgba(79,70,229,0.7)] sm:p-8">
        <span aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/15 blur-3xl" />
        <div className="relative flex flex-wrap items-center gap-5">
          <UserAvatar
            userId={props.finalist.userId}
            name={props.finalist.name}
            hasAvatar={props.finalist.hasAvatar}
            className="h-20 w-20 text-[26px] ring-4 ring-white/30"
          />
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold uppercase tracking-[0.6px] text-white/70">{props.programName}</p>
            <h1 className="text-[26px] font-bold leading-tight tracking-[-0.6px] sm:text-[30px]">{props.finalist.name}</h1>
            {props.finalist.details.length > 0 && <p className="mt-1 text-[14px] text-white/80">{props.finalist.details.join(" · ")}</p>}
          </div>
          <div className="flex gap-2">
            <span className="rounded-2xl bg-white/15 px-4 py-2 text-center ring-1 ring-white/25 backdrop-blur">
              <span className="block text-[20px] font-bold tabular-nums">#{props.finalist.platformRank}</span>
              <span className="block text-[11px] text-white/75">{t("platformRank")}</span>
            </span>
            <span className="rounded-2xl bg-white/15 px-4 py-2 text-center ring-1 ring-white/25 backdrop-blur">
              <span className="block text-[20px] font-bold tabular-nums">{props.finalist.platformScore}</span>
              <span className="block text-[11px] text-white/75">{t("points")}</span>
            </span>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start">
        {/* Projects */}
        <section className="space-y-3" aria-labelledby="projects-heading">
          <h2 id="projects-heading" className="px-1 text-[20px] font-bold tracking-[-0.4px]">
            {t("projects")}
          </h2>
          {props.projects.length === 0 ? (
            <p className={cn(SURFACE, "px-4 py-10 text-center text-[14px] text-muted-foreground")}>{t("noProjects")}</p>
          ) : (
            props.projects.map((p) => {
              const open = openProject === p.id;
              return (
                <div key={p.id} className={cn(SURFACE, "overflow-hidden")}>
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => setOpenProject(open ? null : p.id)}
                    className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted/40"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-gradient-to-br from-sky-400 to-blue-600 text-[13px] font-bold text-white">
                      {p.order}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-medium">{p.title}</span>
                      <span className="block text-[12px] text-muted-foreground">{p.updatedAt}</span>
                    </span>
                    <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} aria-hidden="true" />
                  </button>
                  {open && (
                    <div className="border-t border-border/60 px-4 py-4">
                      <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-foreground/90">{p.content}</p>
                    </div>
                  )}
                </div>
              );
            })
          )}
          <p className="flex items-start gap-2 px-1 text-[12px] text-muted-foreground">
            <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {t("projectsHint")}
          </p>
        </section>

        {/* Sheet */}
        <section className={cn(SURFACE, "space-y-5 p-5 lg:sticky lg:top-24")} aria-labelledby="sheet-heading">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id="sheet-heading" className="text-[20px] font-bold tracking-[-0.4px]">{t("sheet")}</h2>
              <p className="text-[13px] text-muted-foreground">{t("scored", { done: scoredCount, total: props.criteria.length })}</p>
            </div>
            {props.submitted ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-success/12 px-2.5 py-1 text-[12px] font-semibold text-success">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                {t("submitted")}
              </span>
            ) : (
              preview !== null && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[13px] font-bold tabular-nums text-primary">
                  <Medal className="h-3.5 w-3.5" aria-hidden="true" />
                  {preview}%
                </span>
              )
            )}
          </div>

          {props.criteria.map((c, i) => (
            <div key={c.id} className="space-y-2">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-[14px] font-semibold">
                  <span className="mr-1.5 text-muted-foreground">{i + 1}.</span>
                  {c.label}
                </p>
                <span className="shrink-0 text-[12px] text-muted-foreground">
                  {scores[c.id] ?? "—"} / {c.maxScore}
                  {c.weight > 1 && ` · ×${c.weight}`}
                </span>
              </div>
              <ScoreInput label={c.label} maxScore={c.maxScore} value={scores[c.id]} onChange={(v) => setScores((prev) => ({ ...prev, [c.id]: v }))} />
            </div>
          ))}

          <div className="space-y-1.5">
            <label htmlFor="jury-comment" className="block px-1 text-[13px] font-medium text-foreground/80">
              {t("comment")}
            </label>
            <Textarea id="jury-comment" rows={4} maxLength={2000} value={comment} onChange={(e) => setComment(e.target.value)} placeholder={t("commentPlaceholder")} />
          </div>

          <div className="fixed inset-x-0 bottom-[72px] z-20 flex gap-2 border-t border-border/60 bg-background/85 p-3 backdrop-blur-xl lg:static lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
            <Button variant="outline" className="flex-1" disabled={saving !== null || scoredCount === 0} onClick={() => save(false)}>
              {saving === "draft" ? t("saving") : t("saveDraft")}
            </Button>
            <Button className="flex-1" disabled={saving !== null || !complete} onClick={() => save(true)}>
              {saving === "submit" ? t("saving") : props.submitted ? t("update") : t("submit")}
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
