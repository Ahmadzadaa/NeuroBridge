import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  lesson: { findUnique: vi.fn() },
  lessonVideoWatch: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  lessonVideoAnswer: { findMany: vi.fn(), create: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: db }));

import { advanceWatch, answerQuestion, recordHeartbeat, rewindTarget, youtubeId } from "@/lib/lessons/video-watch";

const t0 = new Date("2026-11-01T10:00:00Z");
const after = (sec: number) => new Date(t0.getTime() + sec * 1000);

describe("advanceWatch", () => {
  it("accepts normal playback, even at double speed", () => {
    expect(advanceWatch({ maxWatchedSec: 100, lastBeatAt: t0, now: after(10), position: 110, gateSec: null })).toBe(110);
    expect(advanceWatch({ maxWatchedSec: 100, lastBeatAt: t0, now: after(10), position: 120, gateSec: null })).toBe(120);
  });

  it("refuses a jump ahead: progress grows no faster than 2x the time that passed", () => {
    // 10 s later, a claim of minute 15 only counts up to 100 + 2x10 + 5 s slack.
    expect(advanceWatch({ maxWatchedSec: 100, lastBeatAt: t0, now: after(10), position: 900, gateSec: null })).toBe(125);
  });

  it("stops at an unanswered question and never goes backwards", () => {
    expect(advanceWatch({ maxWatchedSec: 100, lastBeatAt: t0, now: after(30), position: 160, gateSec: 140 })).toBe(140);
    expect(advanceWatch({ maxWatchedSec: 100, lastBeatAt: t0, now: after(10), position: 40, gateSec: null })).toBe(100);
  });
});

describe("rewindTarget", () => {
  it("replays from the previous question, at most 90 s back", () => {
    expect(rewindTarget([60, 200, 400], 200)).toBe(110);
    expect(rewindTarget([60, 120], 120)).toBe(60);
    expect(rewindTarget([45], 45)).toBe(0);
  });
});

describe("youtubeId", () => {
  it("reads the common link forms", () => {
    for (const url of ["https://www.youtube.com/watch?v=bNpx7gpSqbY", "https://youtu.be/bNpx7gpSqbY", "https://www.youtube.com/embed/bNpx7gpSqbY", "https://www.youtube.com/watch?list=x&v=bNpx7gpSqbY"]) {
      expect(youtubeId(url)).toBe("bNpx7gpSqbY");
    }
    expect(youtubeId("https://vimeo.com/123")).toBeNull();
  });
});

const lesson = (questions: { id: string; atSecond: number; correctIndex: number }[] = []) => ({
  id: "l1",
  videoUrl: "https://youtu.be/bNpx7gpSqbY",
  videoKey: null,
  videoDurationSec: 300,
  videoQuestions: questions.map((q) => ({ ...q, prompt: "{}", options: "[]" })),
});

describe("recordHeartbeat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    db.lessonVideoAnswer.findMany.mockResolvedValue([]);
  });

  it("completes only at 95% with every question answered", async () => {
    vi.setSystemTime(after(400));
    db.lesson.findUnique.mockResolvedValue(lesson([{ id: "q1", atSecond: 120, correctIndex: 1 }]));
    db.lessonVideoWatch.findUnique.mockResolvedValue({ id: "w1", maxWatchedSec: 280, lastBeatAt: t0, durationSec: 0, completedAt: null });

    // The open question at 120 s holds progress there, whatever the browser says.
    expect(await recordHeartbeat("l1", "u1", { position: 290, duration: 300 })).toEqual({ maxWatchedSec: 280, completed: false });

    db.lessonVideoAnswer.findMany.mockResolvedValue([{ questionId: "q1" }]);
    expect(await recordHeartbeat("l1", "u1", { position: 290, duration: 300 })).toEqual({ maxWatchedSec: 290, completed: true });
    vi.useRealTimers();
  });
});

describe("answerQuestion", () => {
  beforeEach(() => vi.clearAllMocks());

  it("refuses an answer before the video reached the question", async () => {
    db.lesson.findUnique.mockResolvedValue(lesson([{ id: "q1", atSecond: 120, correctIndex: 1 }]));
    db.lessonVideoWatch.findUnique.mockResolvedValue({ id: "w1", maxWatchedSec: 30 });
    await expect(answerQuestion("l1", "q1", "u1", 1)).rejects.toMatchObject({ code: "NOT_REACHED" });
    expect(db.lessonVideoAnswer.create).not.toHaveBeenCalled();
  });

  it("sends a wrong answer back to rewatch without revealing the right one", async () => {
    db.lesson.findUnique.mockResolvedValue(lesson([{ id: "q1", atSecond: 120, correctIndex: 1 }]));
    db.lessonVideoWatch.findUnique.mockResolvedValue({ id: "w1", maxWatchedSec: 120 });
    expect(await answerQuestion("l1", "q1", "u1", 0)).toEqual({ correct: false, rewindTo: 30 });
    // Progress drops back, so the segment has to be watched again before the next try.
    expect(db.lessonVideoWatch.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ maxWatchedSec: 30 }) }));
    await expect(answerQuestion("l1", "q1", "u1", 1)).resolves.toEqual({ correct: true });
    expect(db.lessonVideoAnswer.create).toHaveBeenCalledTimes(2);
  });
});
