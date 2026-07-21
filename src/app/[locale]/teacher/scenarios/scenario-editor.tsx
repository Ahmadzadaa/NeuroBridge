"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  ChevronDown,
  Loader2,
  Plus,
  Save,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export interface ChoiceDraft {
  label: string;
  detail: string;
  cashDelta: number;
  satisfactionDelta: number;
  reputationDelta: number;
  variance: number;
  feedback: string;
}

export interface RoundDraft {
  title: string;
  context: string;
  choices: ChoiceDraft[];
}

export interface ScenarioDraft {
  name: string;
  description: string;
  startCash: number;
  targetCash: number;
  rounds: RoundDraft[];
}

const emptyChoice = (): ChoiceDraft => ({
  label: "",
  detail: "",
  cashDelta: 0,
  satisfactionDelta: 0,
  reputationDelta: 0,
  variance: 0,
  feedback: "",
});

const emptyRound = (): RoundDraft => ({
  title: "",
  context: "",
  choices: [emptyChoice(), emptyChoice()],
});

export const emptyScenario = (): ScenarioDraft => ({
  name: "",
  description: "",
  startCash: 5000,
  targetCash: 20000,
  rounds: [emptyRound(), emptyRound(), emptyRound()],
});

interface ScenarioEditorProps {
  locale: string;
  userName: string;
  /** Existing scenario id when editing, null when creating. */
  scenarioId: string | null;
  initial: ScenarioDraft;
  hasRuns: boolean;
}

export function ScenarioEditor({
  locale,
  userName,
  scenarioId,
  initial,
  hasRuns,
}: ScenarioEditorProps) {
  const t = useTranslations("teacher.editor");
  const tc = useTranslations("common");
  const router = useRouter();

  const [draft, setDraft] = useState<ScenarioDraft>(initial);
  const [openRound, setOpenRound] = useState(0);
  const [saving, setSaving] = useState(false);

  const backHref = `/${locale}/teacher/scenarios`;

  const roundValid = (round: RoundDraft) =>
    round.title.trim().length > 0 &&
    round.context.trim().length > 0 &&
    round.choices.length >= 2 &&
    round.choices.every(
      (c) => c.label.trim().length > 0 && c.feedback.trim().length > 0
    );

  const valid =
    draft.name.trim().length >= 3 &&
    draft.targetCash > 0 &&
    draft.rounds.length >= 2 &&
    draft.rounds.every(roundValid);

  function patchRound(index: number, patch: Partial<RoundDraft>) {
    setDraft((prev) => ({
      ...prev,
      rounds: prev.rounds.map((r, i) => (i === index ? { ...r, ...patch } : r)),
    }));
  }

  function patchChoice(
    roundIndex: number,
    choiceIndex: number,
    patch: Partial<ChoiceDraft>
  ) {
    setDraft((prev) => ({
      ...prev,
      rounds: prev.rounds.map((round, i) =>
        i === roundIndex
          ? {
              ...round,
              choices: round.choices.map((choice, j) =>
                j === choiceIndex ? { ...choice, ...patch } : choice
              ),
            }
          : round
      ),
    }));
  }

  async function save() {
    if (!valid || saving) return;
    setSaving(true);
    try {
      const payload = {
        name: draft.name.trim(),
        description: draft.description.trim() || undefined,
        startCash: draft.startCash,
        targetCash: draft.targetCash,
        rounds: draft.rounds.map((round) => ({
          title: round.title.trim(),
          context: round.context.trim(),
          choices: round.choices.map((choice) => ({
            label: choice.label.trim(),
            detail: choice.detail.trim() || undefined,
            cashDelta: choice.cashDelta,
            satisfactionDelta: choice.satisfactionDelta,
            reputationDelta: choice.reputationDelta,
            variance: choice.variance,
            feedback: choice.feedback.trim(),
          })),
        })),
      };

      const res = await fetch(
        scenarioId ? `/api/scenarios/${scenarioId}` : "/api/scenarios",
        {
          method: scenarioId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        toast.error(data?.error ?? tc("error"));
        return;
      }
      toast.success(t("saved"));
      router.push(backHref);
      router.refresh();
    } catch {
      toast.error(tc("error"));
    } finally {
      setSaving(false);
    }
  }

  const numberField = (
    label: string,
    value: number,
    onChange: (v: number) => void,
    props?: { min?: number; max?: number }
  ) => (
    <div className="min-w-0">
      <Label className="mb-1 block truncate text-[11px]">{label}</Label>
      <Input
        type="number"
        value={value}
        min={props?.min}
        max={props?.max}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-8 rounded-lg text-center text-[12px]"
      />
    </div>
  );

  return (
    <DashboardLayout
      panel="teacher"
      title={scenarioId ? t("editTitle") : t("createTitle")}
      userName={userName}
    >
      <Link
        href={backHref}
        className="mb-5 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        {t("back")}
      </Link>

      <div className="mx-auto max-w-3xl space-y-5">
        {hasRuns && (
          <p className="flex items-start gap-2 rounded-xl bg-warning/10 px-4 py-3 text-[13px] leading-relaxed text-warning-dark">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {t("runsWarning")}
          </p>
        )}

        {/* ── Meta ────────────────────────────────────────────── */}
        <div className="rounded-2xl bg-card p-6 shadow-sm">
          <h3 className="text-[15px] font-semibold">{t("metaHeading")}</h3>
          <div className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="sc-name">{t("name")}</Label>
              <Input
                id="sc-name"
                required
                maxLength={150}
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder={t("namePlaceholder")}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sc-desc">{t("description")}</Label>
              <Textarea
                id="sc-desc"
                maxLength={500}
                value={draft.description}
                onChange={(e) =>
                  setDraft({ ...draft, description: e.target.value })
                }
                placeholder={t("descriptionPlaceholder")}
                className="min-h-16 rounded-xl"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="sc-start">{t("startCash")}</Label>
                <Input
                  id="sc-start"
                  type="number"
                  min={0}
                  value={draft.startCash}
                  onChange={(e) =>
                    setDraft({ ...draft, startCash: Number(e.target.value) })
                  }
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sc-target">{t("targetCash")}</Label>
                <Input
                  id="sc-target"
                  type="number"
                  min={1}
                  value={draft.targetCash}
                  onChange={(e) =>
                    setDraft({ ...draft, targetCash: Number(e.target.value) })
                  }
                  className="rounded-xl"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Rounds ──────────────────────────────────────────── */}
        {draft.rounds.map((round, roundIndex) => {
          const isOpen = openRound === roundIndex;
          const ok = roundValid(round);
          return (
            <div
              key={roundIndex}
              className={cn(
                "overflow-hidden rounded-2xl bg-card shadow-sm",
                !ok && "ring-1 ring-warning/40"
              )}
            >
              <button
                type="button"
                onClick={() => setOpenRound(isOpen ? -1 : roundIndex)}
                aria-expanded={isOpen}
                className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-subtle"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[12px] font-bold text-primary">
                  {roundIndex + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-[14px] font-semibold">
                  {round.title || t("untitledRound")}
                </span>
                {draft.rounds.length > 2 && (
                  <span
                    role="button"
                    tabIndex={0}
                    aria-label={tc("delete")}
                    onClick={(e) => {
                      e.stopPropagation();
                      setDraft((prev) => ({
                        ...prev,
                        rounds: prev.rounds.filter((_, i) => i !== roundIndex),
                      }));
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.stopPropagation();
                        setDraft((prev) => ({
                          ...prev,
                          rounds: prev.rounds.filter((_, i) => i !== roundIndex),
                        }));
                      }
                    }}
                    className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </span>
                )}
                <ChevronDown
                  className={cn(
                    "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                    isOpen && "rotate-180"
                  )}
                  aria-hidden="true"
                />
              </button>

              {isOpen && (
                <div className="space-y-4 border-t border-border px-5 py-4">
                  <div className="space-y-1.5">
                    <Label>{t("roundTitle")}</Label>
                    <Input
                      maxLength={150}
                      value={round.title}
                      onChange={(e) =>
                        patchRound(roundIndex, { title: e.target.value })
                      }
                      placeholder={t("roundTitlePlaceholder")}
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("roundContext")}</Label>
                    <Textarea
                      maxLength={2000}
                      value={round.context}
                      onChange={(e) =>
                        patchRound(roundIndex, { context: e.target.value })
                      }
                      placeholder={t("roundContextPlaceholder")}
                      className="min-h-20 rounded-xl"
                    />
                  </div>

                  {round.choices.map((choice, choiceIndex) => (
                    <div
                      key={choiceIndex}
                      className="rounded-xl border border-border p-4"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-[12px] font-semibold uppercase tracking-[0.5px] text-muted-foreground">
                          {t("choiceLabel", { letter: String.fromCharCode(65 + choiceIndex) })}
                        </p>
                        {round.choices.length > 2 && (
                          <button
                            type="button"
                            aria-label={tc("delete")}
                            onClick={() =>
                              patchRound(roundIndex, {
                                choices: round.choices.filter(
                                  (_, j) => j !== choiceIndex
                                ),
                              })
                            }
                            className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        )}
                      </div>
                      <div className="mt-3 space-y-3">
                        <Input
                          maxLength={200}
                          value={choice.label}
                          onChange={(e) =>
                            patchChoice(roundIndex, choiceIndex, {
                              label: e.target.value,
                            })
                          }
                          placeholder={t("choiceTitlePlaceholder")}
                          className="rounded-xl"
                        />
                        <Input
                          maxLength={300}
                          value={choice.detail}
                          onChange={(e) =>
                            patchChoice(roundIndex, choiceIndex, {
                              detail: e.target.value,
                            })
                          }
                          placeholder={t("choiceDetailPlaceholder")}
                          className="rounded-xl text-[13px]"
                        />
                        <div className="grid grid-cols-4 gap-2">
                          {numberField(t("cashDelta"), choice.cashDelta, (v) =>
                            patchChoice(roundIndex, choiceIndex, { cashDelta: v })
                          )}
                          {numberField(
                            t("satDelta"),
                            choice.satisfactionDelta,
                            (v) =>
                              patchChoice(roundIndex, choiceIndex, {
                                satisfactionDelta: v,
                              }),
                            { min: -100, max: 100 }
                          )}
                          {numberField(
                            t("repDelta"),
                            choice.reputationDelta,
                            (v) =>
                              patchChoice(roundIndex, choiceIndex, {
                                reputationDelta: v,
                              }),
                            { min: -100, max: 100 }
                          )}
                          {numberField(
                            t("variance"),
                            choice.variance,
                            (v) =>
                              patchChoice(roundIndex, choiceIndex, {
                                variance: Math.max(0, v),
                              }),
                            { min: 0 }
                          )}
                        </div>
                        <Textarea
                          maxLength={1000}
                          value={choice.feedback}
                          onChange={(e) =>
                            patchChoice(roundIndex, choiceIndex, {
                              feedback: e.target.value,
                            })
                          }
                          placeholder={t("choiceFeedbackPlaceholder")}
                          className="min-h-14 rounded-xl text-[13px]"
                        />
                      </div>
                    </div>
                  ))}

                  {round.choices.length < 4 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-lg"
                      onClick={() =>
                        patchRound(roundIndex, {
                          choices: [...round.choices, emptyChoice()],
                        })
                      }
                    >
                      <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                      {t("addChoice")}
                    </Button>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* ── Actions ─────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-3">
          {draft.rounds.length < 15 && (
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => {
                setDraft((prev) => ({
                  ...prev,
                  rounds: [...prev.rounds, emptyRound()],
                }));
                setOpenRound(draft.rounds.length);
              }}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              {t("addRound")}
            </Button>
          )}
          <Button
            className="min-w-[160px] flex-1 rounded-xl"
            disabled={!valid || saving}
            onClick={save}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <>
                <Save className="h-4 w-4" aria-hidden="true" />
                {t("save")}
              </>
            )}
          </Button>
        </div>
        {!valid && (
          <p className="text-center text-[12px] text-muted-foreground">
            {t("validationHint")}
          </p>
        )}
      </div>
    </DashboardLayout>
  );
}
