"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Plus, Timer, Trash2, X } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { loadYouTubeApi } from "@/components/lessons/youtube-api";
import { cn } from "@/lib/utils";

type Lang = "az" | "en" | "tr";
type Text = Record<Lang, string>;
type QuestionDraft = { key: string; id?: string; time: string; prompt: Text; options: Text[]; correctIndex: number };

const LANGS: Lang[] = ["az", "en", "tr"];
const SURFACE = "rounded-[22px] bg-card p-5 ring-1 ring-border/60 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)]";
const empty = (): Text => ({ az: "", en: "", tr: "" });

const formatTime = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
/** "3:20" or "200" → 200; null when it is not a time. */
function parseTime(value: string): number | null {
  const v = value.trim();
  const m = v.match(/^(\d{1,3}):([0-5]\d)$/);
  if (m) return Number(m[1]) * 60 + Number(m[2]);
  return /^\d{1,5}$/.test(v) ? Number(v) : null;
}
const youtubeId = (url: string) =>
  url.match(/(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{6,})/)?.[1] ?? null;

let keySeq = 0;
const newKey = () => `q${++keySeq}`;

export function LessonVideoEditor({
  lessonId,
  lessonTitle,
  trainingTitle,
  initial,
}: {
  lessonId: string;
  lessonTitle: string;
  trainingTitle: string;
  initial: {
    videoUrl: string;
    videoDurationSec: number | null;
    questions: { id: string; atSecond: number; prompt: Text; options: Text[]; correctIndex: number }[];
  };
}) {
  const t = useTranslations("superAdmin.content");
  const router = useRouter();
  const [videoUrl, setVideoUrl] = useState(initial.videoUrl);
  const [duration, setDuration] = useState(initial.videoDurationSec ? formatTime(initial.videoDurationSec) : "");
  const [lang, setLang] = useState<Lang>("az");
  const [questions, setQuestions] = useState<QuestionDraft[]>(() =>
    initial.questions.map((q) => ({ key: newKey(), id: q.id, time: formatTime(q.atSecond), prompt: q.prompt, options: q.options, correctIndex: q.correctIndex }))
  );
  const [detecting, setDetecting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const probeRef = useRef<HTMLDivElement>(null);
  const videoId = youtubeId(videoUrl);

  const update = (key: string, patch: Partial<QuestionDraft>) =>
    setQuestions((qs) => qs.map((q) => (q.key === key ? { ...q, ...patch } : q)));

  /** Reads the length from YouTube itself, so nobody has to type it. */
  async function detectDuration() {
    if (!videoId || !probeRef.current) return;
    setDetecting(true);
    try {
      const YT = await loadYouTubeApi();
      const host = document.createElement("div");
      probeRef.current.replaceChildren(host);
      const seconds = await new Promise<number>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("timeout")), 15000);
        const player = new YT.Player(host, {
          videoId,
          events: {
            onReady: () => {
              clearTimeout(timer);
              const d = Math.round(player.getDuration());
              player.destroy();
              resolve(d);
            },
            onError: () => reject(new Error("player")),
          },
        });
      });
      if (seconds > 0) setDuration(formatTime(seconds));
      else throw new Error("zero");
    } catch {
      toast.error(t("detectFailed"));
    } finally {
      setDetecting(false);
    }
  }

  async function save() {
    setError(null);
    const durationSec = duration.trim() ? parseTime(duration) : null;
    if (duration.trim() && durationSec === null) return setError(t("invalidTime"));
    const payload = [];
    for (const [i, q] of questions.entries()) {
      const at = parseTime(q.time);
      if (at === null || at < 1) return setError(t("questionTime", { n: i + 1 }));
      if (!q.prompt.az.trim() || q.options.some((o) => !o.az.trim())) return setError(t("azRequired", { n: i + 1 }));
      payload.push({ id: q.id, atSecond: at, prompt: q.prompt, options: q.options, correctIndex: q.correctIndex });
    }
    if (questions.length > 0 && !videoId) return setError(t("questionsNeedVideo"));
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/lessons/${lessonId}/video`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoUrl: videoUrl.trim(), videoDurationSec: durationSec, questions: payload.sort((a, b) => a.atSecond - b.atSecond) }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const issue = data?.issues?.fieldErrors ? Object.values(data.issues.fieldErrors).flat()[0] : null;
        setError(typeof issue === "string" ? issue : t("saveError"));
        return;
      }
      toast.success(t("saved"));
      router.refresh();
    } catch {
      setError(t("saveError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-6">
      <Link href="/super-admin/content" className="inline-flex items-center gap-1 text-[14px] font-medium text-primary hover:underline">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {t("back")}
      </Link>
      <div>
        <p className="text-[13px] font-semibold text-primary">{trainingTitle}</p>
        <h1 className="text-[26px] font-bold tracking-[-0.5px]">{lessonTitle}</h1>
      </div>

      <section className={cn(SURFACE, "space-y-4")} aria-labelledby="video-heading">
        <h2 id="video-heading" className="text-[17px] font-bold">{t("videoHeading")}</h2>
        <div className="space-y-1.5">
          <Label htmlFor="video-url">{t("videoUrl")}</Label>
          <Input id="video-url" value={videoUrl} placeholder="https://www.youtube.com/watch?v=…" onChange={(e) => setVideoUrl(e.target.value)} />
          <p className="text-[12px] text-muted-foreground">{t("videoUrlHint")}</p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="video-duration">{t("duration")}</Label>
            <Input id="video-duration" className="w-32" placeholder="12:30" value={duration} onChange={(e) => setDuration(e.target.value)} />
          </div>
          <Button type="button" variant="outline" disabled={!videoId || detecting} onClick={detectDuration}>
            {detecting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Timer className="h-4 w-4" aria-hidden="true" />}
            {t("detect")}
          </Button>
        </div>
        <p className="text-[12px] text-muted-foreground">{t("durationHint")}</p>
        <div ref={probeRef} className="hidden" aria-hidden="true" />
        {videoId && (
          <div className="aspect-video overflow-hidden rounded-xl bg-black">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${videoId}`}
              title={t("preview")}
              className="h-full w-full"
              allow="encrypted-media; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}
      </section>

      <section className={cn(SURFACE, "space-y-4")} aria-labelledby="questions-heading">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="questions-heading" className="text-[17px] font-bold">{t("questionsHeading")}</h2>
            <p className="text-[12px] text-muted-foreground">{t("questionsHint")}</p>
          </div>
          <div role="group" aria-label={t("language")} className="inline-flex rounded-full bg-muted p-0.5 text-[12px] font-semibold">
            {LANGS.map((l) => (
              <button
                key={l}
                type="button"
                aria-pressed={lang === l}
                onClick={() => setLang(l)}
                className={cn("rounded-full px-3 py-1 uppercase", lang === l ? "bg-card text-foreground shadow-sm" : "text-muted-foreground")}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        {questions.length === 0 && <p className="text-[14px] text-muted-foreground">{t("noQuestions")}</p>}

        <ol className="space-y-4">
          {questions.map((q, i) => (
            <li key={q.key} className="space-y-3 rounded-2xl border border-border p-4">
              <div className="flex flex-wrap items-end gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-[13px] font-bold text-primary">{i + 1}</span>
                <div className="space-y-1">
                  <Label htmlFor={`${q.key}-time`} className="text-[12px]">{t("time")}</Label>
                  <Input id={`${q.key}-time`} className="h-9 w-24" placeholder="3:20" value={q.time} onChange={(e) => update(q.key, { time: e.target.value })} />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="ml-auto text-destructive"
                  onClick={() => setQuestions((qs) => qs.filter((x) => x.key !== q.key))}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  {t("removeQuestion")}
                </Button>
              </div>
              <div className="space-y-1">
                <Label htmlFor={`${q.key}-prompt`} className="text-[12px]">
                  {t("prompt")} ({lang.toUpperCase()}){lang !== "az" && ` · ${t("optional")}`}
                </Label>
                <Textarea
                  id={`${q.key}-prompt`}
                  rows={2}
                  maxLength={300}
                  value={q.prompt[lang]}
                  placeholder={lang !== "az" ? q.prompt.az : undefined}
                  onChange={(e) => update(q.key, { prompt: { ...q.prompt, [lang]: e.target.value } })}
                />
              </div>
              <fieldset className="space-y-2">
                <legend className="text-[12px] font-medium">{t("optionsLegend")}</legend>
                {q.options.map((option, j) => (
                  <div key={j} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`${q.key}-correct`}
                      checked={q.correctIndex === j}
                      onChange={() => update(q.key, { correctIndex: j })}
                      aria-label={t("correct", { n: j + 1 })}
                      className="h-4 w-4 accent-[var(--success)]"
                    />
                    <Input
                      className="h-9"
                      maxLength={150}
                      value={option[lang]}
                      placeholder={lang !== "az" ? option.az : t("option", { n: j + 1 })}
                      aria-label={t("option", { n: j + 1 })}
                      onChange={(e) =>
                        update(q.key, { options: q.options.map((o, k) => (k === j ? { ...o, [lang]: e.target.value } : o)) })
                      }
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="w-8 px-0"
                      disabled={q.options.length <= 2}
                      aria-label={t("removeOption")}
                      onClick={() =>
                        update(q.key, {
                          options: q.options.filter((_, k) => k !== j),
                          correctIndex: q.correctIndex === j ? 0 : q.correctIndex > j ? q.correctIndex - 1 : q.correctIndex,
                        })
                      }
                    >
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                    </Button>
                  </div>
                ))}
                <p className="text-[11px] text-muted-foreground">{t("correctHint")}</p>
                {q.options.length < 4 && (
                  <Button type="button" variant="outline" size="sm" onClick={() => update(q.key, { options: [...q.options, empty()] })}>
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    {t("addOption")}
                  </Button>
                )}
              </fieldset>
            </li>
          ))}
        </ol>

        <Button
          type="button"
          variant="outline"
          disabled={questions.length >= 20}
          onClick={() => setQuestions((qs) => [...qs, { key: newKey(), time: "", prompt: empty(), options: [empty(), empty(), empty()], correctIndex: 0 }])}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          {t("addQuestion")}
        </Button>
      </section>

      <div className="sticky bottom-0 z-30 -mx-1 rounded-2xl border border-border/60 bg-background/90 px-4 py-3 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3">
          <p role="alert" className="min-w-0 truncate text-[13px] text-destructive">{error}</p>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {t("save")}
          </Button>
        </div>
      </div>
    </div>
  );
}
