"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  Copy,
  EyeOff,
  GripVertical,
  Loader2,
  Megaphone,
  Plus,
  Save,
  Scale,
  Trash2,
  TriangleAlert,
  UserPlus,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  RankingsTable,
  type RankingRow,
} from "@/components/hackathon/rankings-table";
import { cn } from "@/lib/utils";

interface CriterionDraft {
  key: string;
  name: string;
  maxScore: number;
  weight: number;
}

interface HackathonAdminClientProps {
  locale: string;
  userName: string;
  canManage: boolean;
  program: { id: string; name: string; resultsRevealAt: string | null };
  criteria: { id: string; name: string; maxScore: number; weight: number }[];
  rankings: RankingRow[];
  hasScores: boolean;
  juries: { id: string; name: string; email: string }[];
}

let draftCounter = 0;
const nextKey = () => `draft-${draftCounter++}`;

export function HackathonAdminClient({
  locale,
  userName,
  canManage,
  program,
  criteria,
  rankings,
  hasScores,
  juries,
}: HackathonAdminClientProps) {
  const t = useTranslations("hackathon");
  const tc = useTranslations("common");
  const router = useRouter();

  const [drafts, setDrafts] = useState<CriterionDraft[]>(() =>
    criteria.length > 0
      ? criteria.map((c) => ({
          key: c.id,
          name: c.name,
          maxScore: c.maxScore,
          weight: c.weight,
        }))
      : [{ key: nextKey(), name: "", maxScore: 10, weight: 1 }]
  );
  const [saving, setSaving] = useState(false);
  const [juryEmail, setJuryEmail] = useState("");
  const [addingJury, setAddingJury] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [revealDraft, setRevealDraft] = useState(() =>
    program.resultsRevealAt ? program.resultsRevealAt.slice(0, 16) : ""
  );
  const [savingReveal, setSavingReveal] = useState(false);

  const valid =
    drafts.length > 0 &&
    drafts.every(
      (d) =>
        d.name.trim().length > 0 &&
        d.maxScore >= 1 &&
        d.maxScore <= 100 &&
        d.weight >= 1 &&
        d.weight <= 10
    );

  function updateDraft(key: string, patch: Partial<CriterionDraft>) {
    setDrafts((prev) =>
      prev.map((d) => (d.key === key ? { ...d, ...patch } : d))
    );
  }

  async function saveCriteria() {
    if (!valid || saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/hackathon/criteria", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          programId: program.id,
          criteria: drafts.map((d) => ({
            name: d.name.trim(),
            maxScore: d.maxScore,
            weight: d.weight,
          })),
        }),
      });
      if (!res.ok) throw new Error();
      toast.success(t("criteria.saved"));
      router.refresh();
    } catch {
      toast.error(tc("error"));
    } finally {
      setSaving(false);
    }
  }

  async function addJury(e: React.FormEvent) {
    e.preventDefault();
    if (addingJury) return;
    setAddingJury(true);
    setTempPassword(null);
    try {
      const res = await fetch("/api/hackathon/juries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: juryEmail.trim().toLowerCase() }),
      });
      const data = (await res.json().catch(() => null)) as {
        tempPassword?: string | null;
        error?: string;
      } | null;
      if (!res.ok) {
        toast.error(data?.error ?? tc("error"));
        return;
      }
      if (data?.tempPassword) setTempPassword(data.tempPassword);
      toast.success(t("juries.added"));
      setJuryEmail("");
      router.refresh();
    } catch {
      toast.error(tc("error"));
    } finally {
      setAddingJury(false);
    }
  }

  async function setReveal(revealAt: string | "now" | null) {
    if (savingReveal) return;
    setSavingReveal(true);
    try {
      const res = await fetch("/api/hackathon/reveal", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ programId: program.id, revealAt }),
      });
      const data = (await res.json().catch(() => null)) as {
        emailed?: number;
        error?: string;
      } | null;
      if (!res.ok) {
        toast.error(data?.error ?? tc("error"));
        return;
      }
      if (revealAt === "now") {
        toast.success(
          t("reveal.announced", { count: data?.emailed ?? 0 })
        );
      } else if (revealAt === null) {
        toast.success(t("reveal.cleared"));
      } else {
        toast.success(t("reveal.scheduled"));
      }
      router.refresh();
    } catch {
      toast.error(tc("error"));
    } finally {
      setSavingReveal(false);
    }
  }

  async function removeJury(email: string) {
    try {
      const res = await fetch("/api/hackathon/juries", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error();
      toast.success(t("juries.removed"));
      router.refresh();
    } catch {
      toast.error(tc("error"));
    }
  }

  return (
    <DashboardLayout panel="tenant" title={program.name} userName={userName}>
      <Link
        href={`/${locale}/tenant/programs`}
        className="mb-5 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        {t("backToPrograms")}
      </Link>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_400px]">
        {/* ── Rankings ────────────────────────────────────────── */}
        <div className="min-w-0">
          <h2 className="mb-3 text-[15px] font-semibold">
            {t("rankings.heading")}
          </h2>
          <RankingsTable rankings={rankings} />
        </div>

        {/* ── Reveal + criteria + juries ──────────────────────── */}
        <div className="space-y-4 self-start">
          {(() => {
            const revealDate = program.resultsRevealAt
              ? new Date(program.resultsRevealAt)
              : null;
            const isVisible =
              !revealDate || revealDate.getTime() <= Date.now();
            return (
              <div
                className={cn(
                  "rounded-2xl p-5 shadow-sm",
                  isVisible
                    ? "bg-card ring-1 ring-border"
                    : "bg-gradient-to-br from-warning/10 to-card ring-1 ring-warning/30"
                )}
              >
                <h3 className="flex items-center gap-2 text-[15px] font-semibold">
                  {isVisible ? (
                    <Megaphone
                      className="h-4.5 w-4.5 text-primary"
                      aria-hidden="true"
                    />
                  ) : (
                    <EyeOff
                      className="h-4.5 w-4.5 text-warning-dark"
                      aria-hidden="true"
                    />
                  )}
                  {t("reveal.heading")}
                </h3>
                <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                  {isVisible ? t("reveal.visibleHint") : t("reveal.hiddenHint")}
                </p>
                {revealDate && !isVisible && (
                  <p className="mt-2 rounded-xl bg-warning/10 px-3 py-2 text-[12px] font-semibold text-warning-dark">
                    {t("reveal.scheduledFor", {
                      date: revealDate.toLocaleString(locale),
                    })}
                  </p>
                )}

                {canManage && (
                  <div className="mt-4 space-y-2.5">
                    <div className="flex gap-2">
                      <Input
                        type="datetime-local"
                        value={revealDraft}
                        onChange={(e) => setRevealDraft(e.target.value)}
                        className="h-9 flex-1 rounded-lg text-[13px]"
                        aria-label={t("reveal.dateLabel")}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-9 rounded-lg"
                        disabled={!revealDraft || savingReveal}
                        onClick={() =>
                          setReveal(new Date(revealDraft).toISOString())
                        }
                      >
                        {t("reveal.schedule")}
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="h-9 flex-1 rounded-lg"
                        disabled={savingReveal || isVisible}
                        onClick={() => setReveal("now")}
                      >
                        {savingReveal ? (
                          <Loader2
                            className="h-4 w-4 animate-spin"
                            aria-hidden="true"
                          />
                        ) : (
                          <>
                            <Megaphone className="h-4 w-4" aria-hidden="true" />
                            {t("reveal.announceNow")}
                          </>
                        )}
                      </Button>
                      {revealDate && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-9 rounded-lg"
                          disabled={savingReveal}
                          onClick={() => {
                            setRevealDraft("");
                            setReveal(null);
                          }}
                        >
                          {t("reveal.clear")}
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          <div className="rounded-2xl bg-card p-5 shadow-sm">
            <h3 className="flex items-center gap-2 text-[15px] font-semibold">
              <Scale className="h-4.5 w-4.5 text-primary" aria-hidden="true" />
              {t("criteria.heading")}
            </h3>
            <p className="mt-1 text-[12px] text-muted-foreground">
              {t("criteria.hint")}
            </p>

            {hasScores && canManage && (
              <p className="mt-3 flex items-start gap-2 rounded-xl bg-warning/10 px-3 py-2.5 text-[12px] leading-relaxed text-warning-dark">
                <TriangleAlert
                  className="mt-0.5 h-4 w-4 shrink-0"
                  aria-hidden="true"
                />
                {t("criteria.resetWarning")}
              </p>
            )}

            <div className="mt-4 space-y-2.5">
              {drafts.map((draft) => (
                <div
                  key={draft.key}
                  className="flex items-center gap-2 rounded-xl border border-border p-2.5"
                >
                  <GripVertical
                    className="h-4 w-4 shrink-0 text-border"
                    aria-hidden="true"
                  />
                  <Input
                    value={draft.name}
                    disabled={!canManage}
                    maxLength={100}
                    placeholder={t("criteria.namePlaceholder")}
                    onChange={(e) =>
                      updateDraft(draft.key, { name: e.target.value })
                    }
                    className="h-9 flex-1 rounded-lg text-[13px]"
                  />
                  <div className="flex shrink-0 items-center gap-1">
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      disabled={!canManage}
                      value={draft.maxScore}
                      aria-label={t("criteria.maxScore")}
                      onChange={(e) =>
                        updateDraft(draft.key, {
                          maxScore: Number(e.target.value),
                        })
                      }
                      className="h-9 w-16 rounded-lg text-center text-[13px]"
                    />
                    <span className="text-[11px] text-muted-foreground">
                      ×
                    </span>
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      disabled={!canManage}
                      value={draft.weight}
                      aria-label={t("criteria.weight")}
                      onChange={(e) =>
                        updateDraft(draft.key, { weight: Number(e.target.value) })
                      }
                      className="h-9 w-13 rounded-lg text-center text-[13px]"
                    />
                  </div>
                  {canManage && (
                    <button
                      type="button"
                      aria-label={tc("delete")}
                      onClick={() =>
                        setDrafts((prev) =>
                          prev.filter((d) => d.key !== draft.key)
                        )
                      }
                      className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {canManage && (
              <div className="mt-4 flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 rounded-xl"
                  onClick={() =>
                    setDrafts((prev) => [
                      ...prev,
                      { key: nextKey(), name: "", maxScore: 10, weight: 1 },
                    ])
                  }
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  {t("criteria.add")}
                </Button>
                <Button
                  className="flex-1 rounded-xl"
                  disabled={!valid || saving}
                  onClick={saveCriteria}
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <>
                      <Save className="h-4 w-4" aria-hidden="true" />
                      {tc("save")}
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>

          {/* Juries */}
          <div className="rounded-2xl bg-card p-5 shadow-sm">
            <h3 className="flex items-center gap-2 text-[15px] font-semibold">
              <Users className="h-4.5 w-4.5 text-primary" aria-hidden="true" />
              {t("juries.heading")} ({juries.length})
            </h3>
            {juries.length === 0 ? (
              <p className="mt-3 text-[13px] text-muted-foreground">
                {t("juries.empty")}
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                {juries.map((jury) => (
                  <div
                    key={jury.id}
                    className="group flex items-center gap-2.5 text-[13px]"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                      {jury.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">
                        {jury.name}
                      </span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {jury.email}
                      </span>
                    </span>
                    {canManage && (
                      <button
                        type="button"
                        aria-label={t("juries.remove")}
                        onClick={() => removeJury(jury.email)}
                        className="shrink-0 rounded-lg p-1.5 text-muted-foreground opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {canManage && (
              <form onSubmit={addJury} className="mt-4 border-t border-border pt-4">
                <Label htmlFor="jury-email" className="text-[12px]">
                  {t("juries.addLabel")}
                </Label>
                <div className="mt-1.5 flex gap-2">
                  <Input
                    id="jury-email"
                    type="email"
                    required
                    value={juryEmail}
                    onChange={(e) => setJuryEmail(e.target.value)}
                    placeholder={t("juries.emailPlaceholder")}
                    className="h-9 flex-1 rounded-lg text-[13px]"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    className="h-9 rounded-lg"
                    disabled={!juryEmail.includes("@") || addingJury}
                  >
                    {addingJury ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <UserPlus className="h-4 w-4" aria-hidden="true" />
                    )}
                  </Button>
                </div>
                <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
                  {t("juries.addHint")}
                </p>
                {tempPassword && (
                  <div className="mt-3 rounded-xl bg-success/10 p-3 text-[12px]">
                    <p className="font-semibold text-success">
                      {t("juries.accountCreated")}
                    </p>
                    <p className="mt-1 flex items-center gap-2">
                      <code className="rounded bg-card px-2 py-0.5 font-mono text-[13px]">
                        {tempPassword}
                      </code>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(tempPassword);
                          toast.success(t("juries.passwordCopied"));
                        }}
                        className="text-muted-foreground transition-colors hover:text-foreground"
                        aria-label={tc("copyLink")}
                      >
                        <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </p>
                    <p className="mt-1 text-muted-foreground">
                      {t("juries.passwordHint")}
                    </p>
                  </div>
                )}
              </form>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
