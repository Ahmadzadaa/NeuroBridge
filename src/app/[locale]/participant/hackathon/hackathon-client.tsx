"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { motion, useReducedMotion } from "framer-motion";
import {
  Crown,
  FileText,
  FileUp,
  Loader2,
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
}: HackathonClientProps) {
  const t = useTranslations("hackathon");
  const tc = useTranslations("common");
  const router = useRouter();
  const reducedMotion = useReducedMotion();

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
        toast.error(data?.error ?? tc("error"));
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
        <div className="rounded-2xl bg-card shadow-sm">
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
        initial={reducedMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0, 0, 0.2, 1] }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/12 via-card to-card p-6 shadow-sm ring-1 ring-primary/15 sm:p-8"
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
              <div className="rounded-2xl bg-card p-6 shadow-sm">
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
              <div className="rounded-2xl bg-card p-6 shadow-sm">
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
              <div className="rounded-2xl bg-card p-6 shadow-sm">
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

          {/* Rankings */}
          <div>
            <h3 className="mb-3 text-[15px] font-semibold">{t("rankings.heading")}</h3>
            <RankingsTable rankings={rankings} highlightTeamId={myTeam?.id} />
          </div>
        </div>

        {/* ── Right column ────────────────────────────────────── */}
        <div className="space-y-4">
          {myTeam && (
            <div className="rounded-2xl bg-card p-5 shadow-sm">
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
            <div className="rounded-2xl bg-card p-5 shadow-sm">
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
