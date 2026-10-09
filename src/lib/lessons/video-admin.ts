import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { trilingual } from "@/lib/i18n-content";
import { youtubeId } from "@/lib/lessons/video-watch";

const text = (max: number) =>
  z.object({ az: z.string().trim().min(1).max(max), en: z.string().trim().max(max).default(""), tr: z.string().trim().max(max).default("") });

export const lessonVideoSchema = z
  .object({
    videoUrl: z
      .string()
      .trim()
      .max(500)
      .refine((v) => v === "" || youtubeId(v) !== null, { message: "Not a YouTube link" }),
    videoDurationSec: z.number().int().min(1).max(36_000).nullable(),
    questions: z
      .array(
        z.object({
          id: z.string().max(50).optional(),
          atSecond: z.number().int().min(1).max(36_000),
          prompt: text(300),
          options: z.array(text(150)).min(2).max(4),
          correctIndex: z.number().int().min(0).max(3),
        })
      )
      .max(20),
  })
  .superRefine((value, ctx) => {
    const seconds = new Set<number>();
    value.questions.forEach((q, i) => {
      if (q.correctIndex >= q.options.length) ctx.addIssue({ code: "custom", path: ["questions", i, "correctIndex"], message: "No such option" });
      if (seconds.has(q.atSecond)) ctx.addIssue({ code: "custom", path: ["questions", i, "atSecond"], message: "Two questions at the same second" });
      seconds.add(q.atSecond);
      if (value.videoDurationSec && q.atSecond >= value.videoDurationSec)
        ctx.addIssue({ code: "custom", path: ["questions", i, "atSecond"], message: "After the end of the video" });
    });
  });

export type LessonVideoInput = z.infer<typeof lessonVideoSchema>;

const stored = (t: { az: string; en: string; tr: string }) => trilingual({ az: t.az, ...(t.en ? { en: t.en } : {}), ...(t.tr ? { tr: t.tr } : {}) });

/**
 * Saves a lesson's video and questions. Questions keep their ids when edited,
 * so answers already given stay attached; removed ones go with their answers.
 */
export async function saveLessonVideo(lessonId: string, input: LessonVideoInput) {
  return prisma.$transaction(async (tx) => {
    const lesson = await tx.lesson.findUnique({ where: { id: lessonId }, select: { id: true, videoQuestions: { select: { id: true } } } });
    if (!lesson) return null;
    const known = new Set(lesson.videoQuestions.map((q) => q.id));
    const keep = new Set(input.questions.flatMap((q) => (q.id && known.has(q.id) ? [q.id] : [])));

    await tx.lesson.update({
      where: { id: lessonId },
      data: { videoUrl: input.videoUrl || null, videoDurationSec: input.videoDurationSec },
    });
    await tx.lessonVideoQuestion.deleteMany({ where: { lessonId, id: { notIn: [...keep] } } });
    for (const q of input.questions) {
      const data = { atSecond: q.atSecond, prompt: stored(q.prompt), options: JSON.stringify(q.options.map(stored)), correctIndex: q.correctIndex };
      if (q.id && keep.has(q.id)) await tx.lessonVideoQuestion.update({ where: { id: q.id }, data });
      else await tx.lessonVideoQuestion.create({ data: { ...data, lessonId } });
    }
    return { questions: input.questions.length };
  });
}

/** Reads a stored trilingual value back into editable fields. */
export function editableText(value: string): { az: string; en: string; tr: string } {
  try {
    const parsed = JSON.parse(value) as Record<string, string>;
    return { az: parsed.az ?? "", en: parsed.en ?? "", tr: parsed.tr ?? "" };
  } catch {
    return { az: value, en: "", tr: "" };
  }
}
