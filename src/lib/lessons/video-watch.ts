import { prisma } from "@/lib/prisma";
import { localizedText } from "@/lib/i18n-content";

/**
 * Lesson video rules, enforced on the server.
 *
 * The player in the browser stops seeking ahead and pauses on questions, but
 * anything in a browser can be bypassed, so the numbers that count live here:
 * - the furthest point watched may only grow as fast as the video can play
 *   (MAX_PLAYBACK_RATE x wall-clock time since the last heartbeat);
 * - it cannot pass a question that has not been answered correctly;
 * - the video counts as watched at COMPLETE_RATIO of its length with every
 *   question answered correctly.
 */
export const MAX_PLAYBACK_RATE = 2;
export const HEARTBEAT_SEC = 10;
const SLACK_SEC = 5;
const COMPLETE_RATIO = 0.95;
/** A wrong answer replays at most this much before the question. */
export const REWIND_WINDOW_SEC = 90;

export class VideoWatchError extends Error {
  constructor(
    public readonly code: "NO_VIDEO" | "QUESTION_NOT_FOUND" | "NOT_REACHED",
    public readonly statusCode = 400
  ) {
    super(code);
    this.name = "VideoWatchError";
  }
}

/** New furthest-watched second, bounded by playback speed and the next open question. */
export function advanceWatch(input: {
  maxWatchedSec: number;
  lastBeatAt: Date;
  now: Date;
  position: number;
  gateSec: number | null;
}): number {
  const elapsed = Math.max(0, (input.now.getTime() - input.lastBeatAt.getTime()) / 1000);
  const ceiling = Math.floor(input.maxWatchedSec + elapsed * MAX_PLAYBACK_RATE + SLACK_SEC);
  let next = Math.min(Math.max(0, Math.round(input.position)), ceiling);
  if (input.gateSec !== null) next = Math.min(next, input.gateSec);
  return Math.max(input.maxWatchedSec, next);
}

/** Where a wrong answer sends the viewer back to: the previous question, at most REWIND_WINDOW_SEC earlier. */
export function rewindTarget(questionSeconds: number[], atSecond: number): number {
  const previous = questionSeconds.filter((s) => s < atSecond).reduce((max, s) => Math.max(max, s), 0);
  return Math.max(previous, atSecond - REWIND_WINDOW_SEC, 0);
}

export type VideoSource = { kind: "youtube"; videoId: string } | { kind: "file"; url: string } | { kind: "link"; url: string };

/** YouTube links in any common form, or null. */
export function youtubeId(url: string): string | null {
  const match = url.match(/(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{6,})/);
  return match ? match[1] : null;
}

export function videoSource(lesson: { id: string; videoUrl: string | null; videoKey: string | null }): VideoSource | null {
  if (lesson.videoKey) return { kind: "file", url: `/api/lessons/${lesson.id}/video/file` };
  if (!lesson.videoUrl) return null;
  const id = youtubeId(lesson.videoUrl);
  return id ? { kind: "youtube", videoId: id } : { kind: "link", url: lesson.videoUrl };
}

/** Only videos our player controls can be required; a plain link cannot be tracked. */
const isTracked = (source: VideoSource | null) => source !== null && source.kind !== "link";

async function loadLesson(lessonId: string) {
  return prisma.lesson.findUnique({
    where: { id: lessonId },
    select: {
      id: true,
      videoUrl: true,
      videoKey: true,
      videoDurationSec: true,
      videoQuestions: { orderBy: { atSecond: "asc" }, select: { id: true, atSecond: true, prompt: true, options: true, correctIndex: true } },
    },
  });
}

async function correctlyAnswered(questionIds: string[], userId: string): Promise<Set<string>> {
  if (questionIds.length === 0) return new Set();
  const rows = await prisma.lessonVideoAnswer.findMany({
    where: { userId, correct: true, questionId: { in: questionIds } },
    select: { questionId: true },
  });
  return new Set(rows.map((r) => r.questionId));
}

const effectiveDuration = (lessonDuration: number | null, watchDuration: number) => lessonDuration ?? watchDuration;

/** What the player needs: the source, questions (never their answers) and the viewer's progress. */
export async function getVideoState(lessonId: string, userId: string, locale: string) {
  const lesson = await loadLesson(lessonId);
  if (!lesson) throw new VideoWatchError("NO_VIDEO", 404);
  const source = videoSource(lesson);
  const [watch, answered] = await Promise.all([
    prisma.lessonVideoWatch.findUnique({ where: { lessonId_userId: { lessonId, userId } } }),
    correctlyAnswered(lesson.videoQuestions.map((q) => q.id), userId),
  ]);
  return {
    source,
    tracked: isTracked(source),
    durationSec: effectiveDuration(lesson.videoDurationSec, watch?.durationSec ?? 0),
    maxWatchedSec: watch?.maxWatchedSec ?? 0,
    completed: Boolean(watch?.completedAt) || !isTracked(source),
    maxPlaybackRate: MAX_PLAYBACK_RATE,
    heartbeatSec: HEARTBEAT_SEC,
    questions: lesson.videoQuestions.map((q) => ({
      id: q.id,
      atSecond: q.atSecond,
      prompt: localizedText(q.prompt, locale),
      options: (JSON.parse(q.options) as string[]).map((o) => localizedText(o, locale)),
      answered: answered.has(q.id),
    })),
  };
}

/** Records playback; returns the furthest point the server accepts and whether the video now counts as watched. */
export async function recordHeartbeat(lessonId: string, userId: string, input: { position: number; duration: number }) {
  const lesson = await loadLesson(lessonId);
  if (!lesson || !isTracked(videoSource(lesson))) throw new VideoWatchError("NO_VIDEO", 404);

  const now = new Date();
  const watch =
    (await prisma.lessonVideoWatch.findUnique({ where: { lessonId_userId: { lessonId, userId } } })) ??
    (await prisma.lessonVideoWatch.create({ data: { lessonId, userId, lastBeatAt: now } }));
  if (watch.completedAt) return { maxWatchedSec: watch.maxWatchedSec, completed: true };

  const answered = await correctlyAnswered(lesson.videoQuestions.map((q) => q.id), userId);
  const gate = lesson.videoQuestions.find((q) => !answered.has(q.id))?.atSecond ?? null;
  const maxWatchedSec = advanceWatch({ maxWatchedSec: watch.maxWatchedSec, lastBeatAt: watch.lastBeatAt, now, position: input.position, gateSec: gate });
  // The browser's duration only fills in when the platform team set none.
  const durationSec = watch.durationSec || Math.max(0, Math.round(input.duration));
  const duration = effectiveDuration(lesson.videoDurationSec, durationSec);
  const completed = gate === null && duration > 0 && maxWatchedSec >= duration * COMPLETE_RATIO;

  await prisma.lessonVideoWatch.update({
    where: { id: watch.id },
    data: { maxWatchedSec, durationSec, lastBeatAt: now, ...(completed ? { completedAt: now } : {}) },
  });
  return { maxWatchedSec, completed };
}

/** Checks an answer. Wrong answers do not reveal the right one; they send the viewer back to rewatch. */
export async function answerQuestion(lessonId: string, questionId: string, userId: string, choice: number) {
  const lesson = await loadLesson(lessonId);
  const question = lesson?.videoQuestions.find((q) => q.id === questionId);
  if (!lesson || !question) throw new VideoWatchError("QUESTION_NOT_FOUND", 404);

  const watch = await prisma.lessonVideoWatch.findUnique({ where: { lessonId_userId: { lessonId, userId } } });
  // Answering is only possible once the video has really reached the question.
  if (!watch || watch.maxWatchedSec < question.atSecond - SLACK_SEC) throw new VideoWatchError("NOT_REACHED", 409);

  const correct = choice === question.correctIndex;
  await prisma.lessonVideoAnswer.create({ data: { questionId, userId, choice, correct } });
  if (correct) {
    // Lift the gate at once, so the next heartbeat may move past the question.
    await prisma.lessonVideoWatch.update({ where: { id: watch.id }, data: { maxWatchedSec: Math.max(watch.maxWatchedSec, question.atSecond) } });
    return { correct: true as const };
  }
  // The replay is enforced here too: progress drops back to the start of the
  // segment and must be watched again in real time to reach the question.
  const rewindTo = rewindTarget(lesson.videoQuestions.map((q) => q.atSecond), question.atSecond);
  await prisma.lessonVideoWatch.update({
    where: { id: watch.id },
    data: { maxWatchedSec: Math.min(watch.maxWatchedSec, rewindTo), lastBeatAt: new Date() },
  });
  return { correct: false as const, rewindTo };
}

/** Whether a lesson's video stands between the participant and completing it. */
export async function videoRequirementMet(lessonId: string, userId: string): Promise<boolean> {
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, select: { id: true, videoUrl: true, videoKey: true } });
  if (!lesson || !isTracked(videoSource(lesson))) return true;
  const watch = await prisma.lessonVideoWatch.findUnique({ where: { lessonId_userId: { lessonId, userId } }, select: { completedAt: true } });
  return Boolean(watch?.completedAt);
}
