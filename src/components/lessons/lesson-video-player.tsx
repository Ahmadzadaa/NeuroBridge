"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, ExternalLink, Loader2, Lock, MessageCircleQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { loadYouTubeApi } from "@/components/lessons/youtube-api";

type Source = { kind: "youtube"; videoId: string } | { kind: "file"; url: string } | { kind: "link"; url: string };
type Question = { id: string; atSecond: number; prompt: string; options: string[]; answered: boolean };
type VideoState = {
  source: Source | null;
  tracked: boolean;
  durationSec: number;
  maxWatchedSec: number;
  completed: boolean;
  maxPlaybackRate: number;
  heartbeatSec: number;
  questions: Question[];
};

/** The few calls the rules need, whichever player is behind them. */
interface Media {
  time(): number;
  duration(): number;
  paused(): boolean;
  play(): void;
  pause(): void;
  seek(sec: number): void;
  rate(): number;
  setRate(rate: number): void;
  destroy(): void;
}

const fmt = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;

/**
 * Lesson video with the platform's watch rules: no seeking past what has been
 * watched, at most 2x speed, and questions that pause the video until they are
 * answered — a wrong answer replays the segment. The server re-checks all of
 * it (src/lib/lessons/video-watch.ts); this component only keeps honest
 * viewers on track and reports progress.
 */
export function LessonVideoPlayer({
  lessonId,
  locale,
  onCompletedChange,
  className,
}: {
  lessonId: string;
  locale: string;
  /** Called with the server's verdict, so the page can unlock "complete". */
  onCompletedChange?: (completed: boolean) => void;
  className?: string;
}) {
  const t = useTranslations("lessonVideo");
  const [state, setState] = useState<VideoState | null>(null);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const [position, setPosition] = useState(0);
  const [furthest, setFurthest] = useState(0);
  const [open, setOpen] = useState<Question | null>(null);
  const [choice, setChoice] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<"wrong" | "right" | null>(null);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const mountRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const media = useRef<Media | null>(null);
  const furthestRef = useRef(0);
  const questionsRef = useRef<Question[]>([]);
  const openRef = useRef<Question | null>(null);
  const completedRef = useRef(false);
  const onCompletedRef = useRef(onCompletedChange);
  const [mediaDuration, setMediaDuration] = useState(0);
  useEffect(() => {
    onCompletedRef.current = onCompletedChange;
  }, [onCompletedChange]);

  // Load the source, questions and saved progress.
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/lessons/${lessonId}/video?locale=${encodeURIComponent(locale)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: VideoState) => {
        if (cancelled) return;
        furthestRef.current = data.maxWatchedSec;
        questionsRef.current = data.questions;
        completedRef.current = data.completed;
        setFurthest(data.maxWatchedSec);
        setState(data);
        onCompletedRef.current?.(data.completed);
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [lessonId, locale]);

  const sendHeartbeat = useCallback(async () => {
    const m = media.current;
    if (!m || !state?.tracked || completedRef.current) return;
    try {
      const res = await fetch(`/api/lessons/${lessonId}/video/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ position: furthestRef.current, duration: m.duration() || 0 }),
        keepalive: true,
      });
      if (!res.ok) return;
      const data = (await res.json()) as { completed: boolean };
      if (data.completed && !completedRef.current) {
        completedRef.current = true;
        setState((s) => (s ? { ...s, completed: true } : s));
        onCompletedRef.current?.(true);
      }
    } catch {
      // Offline for a moment: the next heartbeat carries the same position.
    }
  }, [lessonId, state?.tracked]);

  // Create the player once the source is known.
  useEffect(() => {
    if (!state?.source || state.source.kind === "link") return;
    const start = Math.max(0, furthestRef.current - 2);
    let destroyed = false;

    if (state.source.kind === "file") {
      const v = videoRef.current;
      if (!v) return;
      media.current = {
        time: () => v.currentTime,
        duration: () => (Number.isFinite(v.duration) ? v.duration : 0),
        paused: () => v.paused,
        play: () => void v.play().catch(() => undefined),
        pause: () => v.pause(),
        seek: (s) => {
          v.currentTime = s;
        },
        rate: () => v.playbackRate,
        setRate: (r) => {
          v.playbackRate = r;
        },
        destroy: () => undefined,
      };
      const onMeta = () => {
        if (start > 0) v.currentTime = start;
        setReady(true);
      };
      v.addEventListener("loadedmetadata", onMeta, { once: true });
      return () => v.removeEventListener("loadedmetadata", onMeta);
    }

    const videoId = state.source.videoId;
    loadYouTubeApi().then((YT) => {
      if (destroyed || !mountRef.current) return;
      const host = document.createElement("div");
      mountRef.current.replaceChildren(host);
      const player = new YT.Player(host, {
        videoId,
        width: "100%",
        height: "100%",
        playerVars: { rel: 0, modestbranding: 1, playsinline: 1, disablekb: 1, start: Math.floor(start) },
        events: { onReady: () => !destroyed && setReady(true) },
      });
      media.current = {
        time: () => player.getCurrentTime?.() ?? 0,
        duration: () => player.getDuration?.() ?? 0,
        paused: () => player.getPlayerState?.() !== YT.PlayerState.PLAYING,
        play: () => player.playVideo(),
        pause: () => player.pauseVideo(),
        seek: (s) => player.seekTo(s, true),
        rate: () => player.getPlaybackRate?.() ?? 1,
        setRate: (r) => player.setPlaybackRate(r),
        destroy: () => player.destroy(),
      };
    });
    return () => {
      destroyed = true;
      media.current?.destroy();
      media.current = null;
    };
  }, [state?.source]);

  // The rules, checked four times a second.
  useEffect(() => {
    if (!ready || !state?.tracked) return;
    const maxRate = state.maxPlaybackRate;
    let last = media.current?.time() ?? 0;
    const tick = setInterval(() => {
      const m = media.current;
      if (!m) return;
      const now = m.time();
      if (m.rate() > maxRate) m.setRate(maxRate);

      // A question that is open keeps the video paused.
      if (openRef.current) {
        if (!m.paused()) m.pause();
        return;
      }
      // Seeking ahead of what was watched snaps back.
      if (now > furthestRef.current + 1.5 && now - last > 1.5 * maxRate) {
        const playing = !m.paused();
        m.seek(furthestRef.current);
        if (playing) m.play();
        setNotice(t("skipBlocked"));
        last = furthestRef.current;
        return;
      }
      if (now > furthestRef.current) {
        furthestRef.current = now;
        setFurthest(now);
      }
      last = now;
      setPosition(now);
      setMediaDuration(m.duration());

      const next = questionsRef.current.find((q) => !q.answered);
      if (next && now >= next.atSecond - 0.25) {
        m.pause();
        if (now > next.atSecond + 1) m.seek(next.atSecond);
        openRef.current = next;
        setOpen(next);
        setChoice(null);
        setFeedback(null);
        void sendHeartbeat();
      }
    }, 250);
    const beat = setInterval(() => {
      if (media.current && !media.current.paused()) void sendHeartbeat();
    }, state.heartbeatSec * 1000);
    const onHide = () => document.visibilityState === "hidden" && void sendHeartbeat();
    document.addEventListener("visibilitychange", onHide);
    return () => {
      clearInterval(tick);
      clearInterval(beat);
      document.removeEventListener("visibilitychange", onHide);
      void sendHeartbeat();
    };
  }, [ready, state?.tracked, state?.maxPlaybackRate, state?.heartbeatSec, sendHeartbeat, t]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 2500);
    return () => clearTimeout(timer);
  }, [notice]);

  async function submitAnswer() {
    if (!open || choice === null || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/lessons/${lessonId}/video/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: open.id, choice }),
      });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { correct: boolean; rewindTo?: number };
      if (data.correct) {
        questionsRef.current = questionsRef.current.map((q) => (q.id === open.id ? { ...q, answered: true } : q));
        setState((s) => (s ? { ...s, questions: questionsRef.current } : s));
        setFeedback("right");
        setTimeout(() => {
          openRef.current = null;
          setOpen(null);
          media.current?.play();
        }, 700);
      } else {
        setFeedback("wrong");
        const back = data.rewindTo ?? 0;
        setTimeout(() => {
          // The segment must be watched again: what was watched shrinks back too.
          furthestRef.current = back;
          setFurthest(back);
          openRef.current = null;
          setOpen(null);
          media.current?.seek(back);
          media.current?.play();
        }, 1600);
      }
    } catch {
      setNotice(t("answerError"));
    } finally {
      setSending(false);
    }
  }

  if (failed) return <p className="text-sm text-destructive">{t("loadError")}</p>;
  if (!state) {
    return (
      <div className={cn("flex aspect-video items-center justify-center rounded-2xl bg-muted", className)}>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
      </div>
    );
  }
  if (!state.source) return null;
  if (state.source.kind === "link") {
    return (
      <a href={state.source.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
        <ExternalLink className="h-4 w-4" aria-hidden="true" />
        {t("openLink")}
      </a>
    );
  }

  const duration = state.durationSec || mediaDuration;
  const answered = state.questions.filter((q) => q.answered).length;
  const watchedPct = duration ? Math.min(100, Math.round((furthest / duration) * 100)) : 0;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="relative aspect-video overflow-hidden rounded-2xl bg-black">
        {state.source.kind === "file" ? (
          <video
            ref={videoRef}
            src={state.source.url}
            controls
            controlsList="nodownload noplaybackrate"
            disablePictureInPicture
            playsInline
            preload="metadata"
            onEnded={() => void sendHeartbeat()}
            onContextMenu={(e) => e.preventDefault()}
            className="h-full w-full"
          />
        ) : (
          <div ref={mountRef} className="h-full w-full [&>iframe]:h-full [&>iframe]:w-full" />
        )}

        {notice && (
          <p role="status" className="absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-black/75 px-3 py-1.5 text-[12px] font-medium text-white">
            <Lock className="mr-1 inline h-3 w-3" aria-hidden="true" />
            {notice}
          </p>
        )}

        {open && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <div role="dialog" aria-modal="true" aria-labelledby="video-question" className="w-full max-w-md rounded-2xl bg-card p-5 text-foreground shadow-2xl">
              <p className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.5px] text-primary">
                <MessageCircleQuestion className="h-4 w-4" aria-hidden="true" />
                {t("questionN", { n: state.questions.findIndex((q) => q.id === open.id) + 1, total: state.questions.length })}
              </p>
              <p id="video-question" className="mt-2 text-[16px] font-semibold leading-snug">{open.prompt}</p>
              <div role="radiogroup" aria-labelledby="video-question" className="mt-4 space-y-2">
                {open.options.map((option, i) => (
                  <button
                    key={i}
                    type="button"
                    role="radio"
                    aria-checked={choice === i}
                    disabled={sending || feedback !== null}
                    onClick={() => setChoice(i)}
                    className={cn(
                      "w-full rounded-xl border px-3.5 py-2.5 text-left text-[14px] transition-colors",
                      choice === i ? "border-primary bg-primary/10" : "border-border hover:bg-muted/60"
                    )}
                  >
                    {option}
                  </button>
                ))}
              </div>
              {feedback === "wrong" && <p role="alert" className="mt-3 text-[13px] font-medium text-destructive">{t("wrong")}</p>}
              {feedback === "right" && (
                <p role="status" className="mt-3 flex items-center gap-1 text-[13px] font-medium text-success">
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  {t("right")}
                </p>
              )}
              <Button className="mt-4 w-full" disabled={choice === null || sending || feedback !== null} onClick={submitAnswer}>
                {sending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : t("submit")}
              </Button>
            </div>
          </div>
        )}
      </div>

      {state.tracked && (
        <div className="space-y-1.5">
          <div className="relative h-1.5 rounded-full bg-muted" aria-hidden="true">
            <div className="absolute inset-y-0 left-0 rounded-full bg-primary/35" style={{ width: `${watchedPct}%` }} />
            {duration > 0 && (
              <div className="absolute inset-y-0 left-0 rounded-full bg-primary" style={{ width: `${Math.min(100, (position / duration) * 100)}%` }} />
            )}
            {duration > 0 &&
              state.questions.map((q) => (
                <span
                  key={q.id}
                  title={fmt(q.atSecond)}
                  className={cn("absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-background", q.answered ? "bg-success" : "bg-amber-500")}
                  style={{ left: `${Math.min(100, (q.atSecond / duration) * 100)}%` }}
                />
              ))}
          </div>
          <p className="flex flex-wrap items-center justify-between gap-2 text-[12px] text-muted-foreground">
            <span>
              {t("watched", { pct: watchedPct })}
              {state.questions.length > 0 && ` · ${t("questionsProgress", { done: answered, total: state.questions.length })}`}
            </span>
            {state.completed ? (
              <span className="inline-flex items-center gap-1 font-medium text-success">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                {t("completed")}
              </span>
            ) : (
              <span>{t("rules")}</span>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
