import { getTranslations, setRequestLocale } from "next-intl/server";
import { ChevronRight, MessageCircleQuestion, PlayCircle, VideoOff } from "lucide-react";
import { requireRole } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { localized } from "@/lib/i18n-content";
import { Link } from "@/i18n/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { LargeTitle } from "@/components/ui/ios";
import { cn } from "@/lib/utils";

/** Platform content: every training's lessons, with their video and in-video questions. */
export default async function ContentPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireRole(locale, ["SUPER_ADMIN"]);
  const t = await getTranslations("superAdmin.content");

  const trainings = await prisma.training.findMany({
    orderBy: { titleEn: "asc" },
    select: {
      id: true,
      titleAz: true,
      titleEn: true,
      titleTr: true,
      lessons: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          order: true,
          titleAz: true,
          titleEn: true,
          titleTr: true,
          videoUrl: true,
          videoKey: true,
          _count: { select: { videoQuestions: true } },
        },
      },
    },
  });

  return (
    <DashboardLayout panel="super-admin" title={t("title")} userName={session.user.name ?? "Admin"}>
      <div className="mx-auto max-w-4xl space-y-8">
        <LargeTitle title={t("title")} subtitle={t("subtitle")} />
        {trainings.length === 0 && (
          <p className="rounded-[22px] bg-card px-4 py-10 text-center text-[14px] text-muted-foreground ring-1 ring-border/60">{t("empty")}</p>
        )}
        {trainings.map((training) => (
          <section key={training.id} className="space-y-2.5">
            <h2 className="px-1 text-[17px] font-bold tracking-[-0.3px]">{localized(training, "title", locale)}</h2>
            <ul className="overflow-hidden rounded-[22px] bg-card ring-1 ring-border/60">
              {training.lessons.map((lesson) => {
                const hasVideo = Boolean(lesson.videoUrl || lesson.videoKey);
                return (
                  <li key={lesson.id} className="border-t border-border/60 first:border-t-0">
                    <Link href={`/super-admin/content/lessons/${lesson.id}`} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40">
                      <span
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px]",
                          hasVideo ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                        )}
                        aria-hidden="true"
                      >
                        {hasVideo ? <PlayCircle className="h-[18px] w-[18px]" /> : <VideoOff className="h-[18px] w-[18px]" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-medium">
                          <span className="mr-1.5 text-muted-foreground">{lesson.order}.</span>
                          {localized(lesson, "title", locale)}
                        </span>
                        <span className="block text-[12px] text-muted-foreground">{hasVideo ? t("hasVideo") : t("noVideo")}</span>
                      </span>
                      {lesson._count.videoQuestions > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/12 px-2 py-0.5 text-[12px] font-semibold text-amber-600 dark:text-amber-400">
                          <MessageCircleQuestion className="h-3.5 w-3.5" aria-hidden="true" />
                          {lesson._count.videoQuestions}
                        </span>
                      )}
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" aria-hidden="true" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </DashboardLayout>
  );
}
