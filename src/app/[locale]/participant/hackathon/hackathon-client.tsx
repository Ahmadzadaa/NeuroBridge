"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useApiErrorMessage } from "@/lib/api/api-error";
import { motion, useReducedMotion } from "framer-motion";
import confetti from "canvas-confetti";
import {
  Crown,
  FileText,
  FileUp,
  Hourglass,
  Loader2,
  MessageSquareQuote,
  Plus,
  Rocket,
  Upload,
  UserPlus,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/ui/empty-state";
import {
  RankingsTable,
  type RankingCriterion,
  type RankingRow,
} from "@/components/hackathon/rankings-table";
import { cn } from "@/lib/utils";

interface TeamSummary {
  id: string;
  name: string;
  slogan: string | null;
  memberCount: number;
}

interface MyTeam {
  id: string;
  name: string;
  slogan: string | null;
  isLeader: boolean;
  members: { name: string; isLeader: boolean }[];
  submissions: {
    id: string;
    title: string;
    version: number;
    fileName: string;
    createdAt: string;
  }[];
}

export interface CriterionFeedback {
  criterionId: string;
  name: string;
  maxScore: number;
  entries: { juryLabel: number; score: number; comment: string | null }[];
}

interface HackathonClientProps {
  locale: string;
  userName: string;
  coinBalance: number;
  program: {
    id: string;
    name: string;
    description: string | null;
    deadline: string | null;
  } | null;
  myTeam: MyTeam | null;
  teams: TeamSummary[];
  rankings: RankingRow[];
  criteria: RankingCriterion[];
  resultsRevealAt: string | null;
  resultsAreVisible: boolean;
  feedback: CriterionFeedback[];
}

/** Live countdown to the reveal moment; refreshes the page when it hits zero. */
function RevealCountdown({ revealAt }: { revealAt: string }) {
  const t = useTranslations("hackathon.reveal");
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const [remaining, setRemaining] = useState(
    () => new Date(revealAt).getTime() - Date.now()
  );

  useEffect(() => {
    const timer = setInterval(() => {
      const left = new Date(revealAt).getTime() - Date.now();
      setRemaining(left);
      if (left <= 0) {
        clearInterval(timer);
        if (!reducedMotion) {
          confetti({
            particleCount: 160,
            spread: 100,
            origin: { y: 0.4 },
            disableForReducedMotion: true,
          });
        }
        router.refresh();
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [revealAt, router, reducedMotion]);

  const total = Math.max(0, remaining);
  const days = Math.floor(total / 86_400_000);
  const hours = Math.floor((total % 86_400_000) / 3_600_000);
  const minutes = Math.floor((total % 3_600_000) / 60_000);
  const seconds = Math.floor((total % 60_000) / 1000);
  const cells = [
    { value: days, label: t("days") },
    { value: hours, label: t("hours") },
    { value: minutes, label: t("minutes") },
    { value: seconds, label: t("seconds") },
  ];

  return (
    <div className="rounded-2xl bg-gradient-to-br from-primary/12 via-card to-card p-8 text-center shadow-sm ring-1 ring-primary/20">
      <Hourglass
        className="mx-auto h-8 w-8 text-primary"
        aria-hidden="true"
      />
      <h3 className="mt-3 text-[17px] font-bold">{t("countdownTitle")}</h3>
      <p className="mx-auto mt-1 max-w-sm text-[13px] text-muted-foreground">
        {t("countdownHint")}
      </p>
      <div className="mx-auto mt-6 flex max-w-sm justify-center gap-3">
        {cells.map((cell) => (
          <div
            key={cell.label}
            className="w-18 rounded-xl bg-card px-2 py-3 shadow-sm ring-1 ring-border"
          >
            <p className="text-[24px] font-bold tabular-nums leading-none">
              {String(cell.value).padStart(2, "0")}
            </p>
            <p className="mt-1 text-[10px] uppercase tracking-[0.5px] text-muted-foreground">
              {cell.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

const MAX_TEAM_SIZE = 5;

export function HackathonClient({
  locale,
  userName,
  coinBalance,
  program,
  myTeam,
  teams,
  rankings,
  criteria,
  resultsRevealAt,
  resultsAreVisible,
  feedback,
}: HackathonClientProps) {
  const t = useTranslations("hackathon");
  const tc = useTranslations("common");
  const apiError = useApiErrorMessage();
  const router = useRouter();

  const [teamName, setTeamName] = useState("");
  const [slogan, setSlogan] = useState("");
  const [busy, setBusy] = useState(false);

  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function createTeam(e: React.FormEvent) {
    e.preventDefault();
    if (!program || busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/hackathon/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          programId: program.id,
          name: teamName,
          slogan: slogan || undefined,
        }),
      });
      if (res.status === 409) {
        toast.error(t("team.nameTaken"));
        return;
      }
      if (!res.ok) throw new Error();
      toast.success(t("team.created"));
      router.refresh();
    } catch {
      toast.error(tc("error"));
    } finally {
      setBusy(false);
    }
  }

  async function joinTeam(teamId: string) {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/hackathon/teams/${teamId}/join`, {
        method: "POST",
      });
      if (res.status === 409) {
        toast.error(t("team.full"));
        return;
      }
      if (!res.ok) throw new Error();
      toast.success(t("team.joined"));
      router.refresh();
    } catch {
      toast.error(tc("error"));
    } finally {
      setBusy(false);
    }
  }

  async function submitProject(e: React.FormEvent) {
    e.preventDefault();
    if (!myTeam || !file || busy) return;
    setBusy(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("title", title);
      formData.set("summary", summary);
      const res = await fetch(`/api/hackathon/teams/${myTeam.id}/submission`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        toast.error(apiError(data));
        return;
      }
      toast.success(t("submission.uploaded"));
      setTitle("");
      setSummary("");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      router.refresh();
    } catch {
      toast.error(tc("error"));
    } finally {
      setBusy(false);
    }
  }

  if (!program) {
    return (
      <DashboardLayout
        panel="participant"
        title={t("title")}
        userName={userName}
        coinBalance={coinBalance}
      >
        <div className="rounded-[22px] bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)] ring-1 ring-border/60">
          <EmptyState title={t("noProgram")} description={t("noProgramHint")} />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      panel="participant"
      title={t("title")}
      userName={userName}
      coinBalance={coinBalance}
    >
      {/* ── Program hero ───────────────────────────────────────── */}
      <motion.div
        style={{ "--i": 0 } as React.CSSProperties}
        className="ios-reveal relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/12 via-card to-card p-6 shadow-sm ring-1 ring-primary/15 sm:p-8"
      >
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Rocket className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h2 className="text-[19px] font-bold leading-snug">{program.name}</h2>
            {program.description && (
              <p className="mt-1 max-w-2xl text-[14px] text-muted-foreground">
                {program.description}
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-2 text-[12px]">
              <span className="rounded-full bg-subtle px-3 py-1 font-medium">
                <Users className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
                {t("teamCount", { count: teams.length })}
              </span>
              {program.deadline && (
                <span className="rounded-full bg-subtle px-3 py-1 font-medium">
                  {t("deadline")}:{" "}
                  {new Date(program.deadline).toLocaleDateString(locale)}
                </span>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
        {/* ── Left column ─────────────────────────────────────── */}
        <div className="min-w-0 space-y-6">
          {myTeam ? (
            <>
              {/* Submission upload */}
              <div className="rounded-[22px] bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)] ring-1 ring-border/60 p-6">
                <h3 className="flex items-center gap-2 text-[15px] font-semibold">
                  <FileUp className="h-4.5 w-4.5 text-primary" aria-hidden="true" />
                  {t("submission.heading")}
                </h3>
                <p className="mt-1 text-[13px] text-muted-foreground">
                  {t("submission.hint")}
                </p>

                <form onSubmit={submitProject} className="mt-5 space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="sub-title">{t("submission.projectTitle")}</Label>
                    <Input
                      id="sub-title"
                      required
                      minLength={3}
                      maxLength={150}
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder={t("submission.titlePlaceholder")}
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="sub-summary">{t("submission.summary")}</Label>
                    <Textarea
                      id="sub-summary"
                      maxLength={600}
                      value={summary}
                      onChange={(e) => setSummary(e.target.value)}
                      placeholder={t("submission.summaryPlaceholder")}
                      className="min-h-20 rounded-xl"
                    />
                  </div>

                  <label
                    className={cn(
                      "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors",
                      file
                        ? "border-success/50 bg-success/5"
                        : "border-border hover:border-primary/50 hover:bg-subtle"
                    )}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="application/pdf"
                      className="sr-only"
                      onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    />
                    {file ? (
                      <>
                        <FileText className="h-8 w-8 text-success" aria-hidden="true" />
                        <p className="text-[13px] font-semibold">{file.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {(file.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </>
                    ) : (
                      <>
                        <Upload
                          className="h-8 w-8 text-muted-foreground"
                          aria-hidden="true"
                        />
                        <p className="text-[13px] font-medium">
                          {t("submission.dropHint")}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {t("submission.pdfOnly")}
                        </p>
                      </>
                    )}
                  </label>

                  <Button
                    type="submit"
                    disabled={!file || title.trim().length < 3 || busy}
                    className="w-full rounded-xl"
                  >
                    {busy ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <>
                        <Upload className="h-4 w-4" aria-hidden="true" />
                        {myTeam.submissions.length > 0
                          ? t("submission.uploadNewVersion")
                          : t("submission.upload")}
                      </>
                    )}
                  </Button>
                </form>

                {myTeam.submissions.length > 0 && (
                  <div className="mt-6 border-t border-border pt-4">
                    <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">
                      {t("submission.history")}
                    </p>
                    <div className="space-y-2">
                      {myTeam.submissions.map((s) => (
                        <a
                          key={s.id}
                          href={`/api/hackathon/submissions/${s.id}/file`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-3 rounded-xl border border-border px-4 py-3 text-[13px] transition-colors hover:bg-subtle"
                        >
                          <FileText
                            className="h-4.5 w-4.5 shrink-0 text-primary"
                            aria-hidden="true"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium">
                              {s.title}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              v{s.version} · {s.fileName}
                            </span>
                          </span>
                          <span className="shrink-0 text-[11px] text-muted-foreground">
                            {new Date(s.createdAt).toLocaleDateString(locale)}
                          </span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Create team */}
              <div className="rounded-[22px] bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)] ring-1 ring-border/60 p-6">
                <h3 className="flex items-center gap-2 text-[15px] font-semibold">
                  <Plus className="h-4.5 w-4.5 text-primary" aria-hidden="true" />
                  {t("team.createHeading")}
                </h3>
                <form onSubmit={createTeam} className="mt-4 space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="team-name">{t("team.name")}</Label>
                    <Input
                      id="team-name"
                      required
                      minLength={2}
                      maxLength={80}
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      placeholder={t("team.namePlaceholder")}
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="team-slogan">{t("team.slogan")}</Label>
                    <Input
                      id="team-slogan"
                      maxLength={160}
                      value={slogan}
                      onChange={(e) => setSlogan(e.target.value)}
                      placeholder={t("team.sloganPlaceholder")}
                      className="rounded-xl"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={teamName.trim().length < 2 || busy}
                    className="w-full rounded-xl"
                  >
                    {busy ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : (
                      t("team.create")
                    )}
                  </Button>
                </form>
              </div>

              {/* Join team */}
              <div className="rounded-[22px] bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)] ring-1 ring-border/60 p-6">
                <h3 className="flex items-center gap-2 text-[15px] font-semibold">
                  <UserPlus className="h-4.5 w-4.5 text-primary" aria-hidden="true" />
                  {t("team.joinHeading")}
                </h3>
                {teams.length === 0 ? (
                  <p className="mt-4 text-[13px] text-muted-foreground">
                    {t("team.noTeams")}
                  </p>
                ) : (
                  <div className="mt-4 space-y-2">
                    {teams.map((team) => {
                      const full = team.memberCount >= MAX_TEAM_SIZE;
                      return (
                        <div
                          key={team.id}
                          className="flex items-center gap-3 rounded-xl border border-border px-4 py-3"
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13px] font-semibold">
                              {team.name}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              {team.memberCount}/{MAX_TEAM_SIZE}
                              {team.slogan && ` · ${team.slogan}`}
                            </span>
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-lg"
                            disabled={full || busy}
                            onClick={() => joinTeam(team.id)}
                          >
                            {full ? t("team.fullLabel") : t("team.join")}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Jury feedback — after reveal only */}
          {resultsAreVisible && feedback.length > 0 && (
            <div>
              <h3 className="mb-3 flex items-center gap-2 text-[15px] font-semibold">
                <MessageSquareQuote
                  className="h-4.5 w-4.5 text-primary"
                  aria-hidden="true"
                />
                {t("feedback.heading")}
              </h3>
              <div className="space-y-3">
                {feedback.map((criterion) => (
                  <div
                    key={criterion.criterionId}
                    className="rounded-[22px] bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)] ring-1 ring-border/60 p-5"
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="text-[14px] font-semibold">{criterion.name}</p>
                      <p className="shrink-0 text-[12px] text-muted-foreground">
                        {t("feedback.outOf", { max: criterion.maxScore })}
                      </p>
                    </div>
                    <div className="mt-3 space-y-2.5">
                      {criterion.entries.map((entry, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-3 rounded-xl bg-subtle/60 px-3.5 py-2.5"
                        >
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                            J{entry.juryLabel}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-semibold tabular-nums">
                              {entry.score} / {criterion.maxScore}
                            </p>
                            {entry.comment && (
                              <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
                                “{entry.comment}”
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rankings — or the reveal countdown */}
          <div>
            <h3 className="mb-3 text-[15px] font-semibold">{t("rankings.heading")}</h3>
            {resultsAreVisible ? (
              <RankingsTable rankings={rankings} highlightTeamId={myTeam?.id} />
            ) : resultsRevealAt ? (
              <RevealCountdown revealAt={resultsRevealAt} />
            ) : null}
          </div>
        </div>

        {/* ── Right column ────────────────────────────────────── */}
        <div className="space-y-4">
          {myTeam && (
            <div className="rounded-[22px] bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)] ring-1 ring-border/60 p-5">
              <p className="text-[12px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">
                {t("team.myTeam")}
              </p>
              <h3 className="mt-1 text-[17px] font-bold">{myTeam.name}</h3>
              {myTeam.slogan && (
                <p className="mt-0.5 text-[13px] italic text-muted-foreground">
                  “{myTeam.slogan}”
                </p>
              )}
              <div className="mt-4 space-y-2">
                {myTeam.members.map((member) => (
                  <div
                    key={member.name}
                    className="flex items-center gap-2.5 text-[13px]"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                      {member.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </span>
                    <span className="flex-1 truncate font-medium">
                      {member.name}
                    </span>
                    {member.isLeader && (
                      <Crown className="h-3.5 w-3.5 text-coin" aria-hidden="true" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Criteria overview */}
          {criteria.length > 0 && (
            <div className="rounded-[22px] bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)] ring-1 ring-border/60 p-5">
              <p className="text-[12px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">
                {t("criteria.heading")}
              </p>
              <div className="mt-3 space-y-2.5">
                {criteria.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between gap-3 text-[13px]"
                  >
                    <span className="font-medium">{c.name}</span>
                    <span className="shrink-0 rounded-full bg-subtle px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
                      {c.maxScore} {t("criteria.points")} · ×{c.weight}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
