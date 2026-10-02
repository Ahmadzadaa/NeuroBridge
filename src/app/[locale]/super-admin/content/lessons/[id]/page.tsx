import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireRole } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { localized } from "@/lib/i18n-content";
import { editableText } from "@/lib/lessons/video-admin";
import { maxVideoBytes } from "@/lib/lessons/video-file";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { LessonVideoEditor } from "./lesson-video-editor";

export default async function LessonVideoPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const session = await requireRole(locale, ["SUPER_ADMIN"]);
  const t = await getTranslations("superAdmin.content");

  const lesson = await prisma.lesson.findUnique({
    where: { id },
    select: {
      id: true,
      titleAz: true,
      titleEn: true,
      titleTr: true,
      videoUrl: true,
      videoKey: true,
      videoDurationSec: true,
      training: { select: { titleAz: true, titleEn: true, titleTr: true } },
      videoQuestions: { orderBy: { atSecond: "asc" }, select: { id: true, atSecond: true, prompt: true, options: true, correctIndex: true } },
    },
  });
  if (!lesson) notFound();

  return (
    <DashboardLayout panel="super-admin" title={t("editTitle")} userName={session.user.name ?? "Admin"}>
      <LessonVideoEditor
        lessonId={lesson.id}
        lessonTitle={localized(lesson, "title", locale)}
        trainingTitle={localized(lesson.training, "title", locale)}
        maxVideoMb={Math.floor(maxVideoBytes() / 1024 / 1024)}
        initial={{
          videoUrl: lesson.videoUrl ?? "",
          videoKey: lesson.videoKey,
          videoDurationSec: lesson.videoDurationSec,
          questions: lesson.videoQuestions.map((q) => ({
            id: q.id,
            atSecond: q.atSecond,
            prompt: editableText(q.prompt),
            options: (JSON.parse(q.options) as string[]).map(editableText),
            correctIndex: q.correctIndex,
          })),
        }}
      />
    </DashboardLayout>
  );
}
