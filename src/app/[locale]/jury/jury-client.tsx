"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { CheckCircle2, ChevronRight, Clock3, FileText, Users } from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { EmptyState } from "@/components/ui/empty-state";
import { ProgressRing, WelcomeHero } from "@/components/dashboard/dashboard-kit";
import { cn } from "@/lib/utils";

export interface JuryEntry {
  submissionId: string;
  teamName: string;
  memberCount: number;
  programName: string;
  title: string;
  version: number;
  submittedAt: string;
  totalCriteria: number;
  scoredCriteria: number;
  done: boolean;
}

interface JuryDashboardClientProps {
  locale: string;
  userName: string;
  entries: JuryEntry[];
}

export function JuryDashboardClient({
  locale,
  userName,
  entries,
}: JuryDashboardClientProps) {
  const t = useTranslations("hackathon.jury");
  const tc = useTranslations("common");

  const pending = entries.filter((e) => !e.done);
  const completed = entries.filter((e) => e.done);

  // A staggered framer-motion fade used to wrap each card. It left every card
  // at `opacity: 0` when the document was hidden at mount (a background tab),
  // so the list looked empty and nothing could be clicked. The CSS animation
  // rests in the visible state instead — see `.animate-enter`.
  const renderCard = (entry: JuryEntry) => (
      <Link
        key={entry.submissionId}
        href={`/${locale}/jury/submissions/${entry.submissionId}`}
        className={cn(
          "animate-enter group flex items-center gap-4 rounded-[22px] bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)] ring-1 ring-border/60 p-5 ring-1 ring-transparent",
          "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:ring-primary/20"
        )}
      >
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
            entry.done ? "bg-success/10 text-success" : "bg-primary/10 text-primary"
          )}
        >
          {entry.done ? (
            <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
          ) : (
            <FileText className="h-5 w-5" aria-hidden="true" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold">{entry.title}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] text-muted-foreground">
            <span className="font-medium text-foreground/80">{entry.teamName}</span>
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" aria-hidden="true" />
              {entry.memberCount}
            </span>
            <span>{entry.programName}</span>
            <span>v{entry.version}</span>
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span
            className={cn(
              "rounded-full px-3 py-1 text-[11px] font-semibold",
              entry.done
                ? "bg-success/10 text-success"
                : "bg-warning/10 text-warning-dark"
            )}
          >
            {entry.done
              ? t("scored")
              : t("scoredProgress", {
                  scored: entry.scoredCriteria,
                  total: entry.totalCriteria,
                })}
          </span>
          <ChevronRight
            className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </div>
      </Link>
  );

  return (
    <DashboardLayout panel="jury" title={t("dashboardTitle")} userName={userName}>
      <div className="mb-8">
        <WelcomeHero
          eyebrow={t("dashboardTitle")}
          title={t("greeting", { name: userName.split(" ")[0] })}
          subtitle={t("dashboardSubtitle")}
          aside={
            entries.length > 0 && (
              <ProgressRing
                value={(completed.length / entries.length) * 100}
                label={`${completed.length}/${entries.length}`}
                caption={t("scored")}
                onDark
                responsive
                size={120}
              />
            )
          }
        />
      </div>

      {entries.length === 0 ? (
        <div className="rounded-[22px] bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)] ring-1 ring-border/60">
          <EmptyState title={tc("noData")} description={t("noSubmissions")} />
        </div>
      ) : (
        <div className="space-y-8">
          {pending.length > 0 && (
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">
                <Clock3 className="h-4 w-4" aria-hidden="true" />
                {t("pendingHeading")} ({pending.length})
              </h2>
              <div className="space-y-3">{pending.map(renderCard)}</div>
            </section>
          )}
          {completed.length > 0 && (
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                {t("completedHeading")} ({completed.length})
              </h2>
              <div className="space-y-3">{completed.map(renderCard)}</div>
            </section>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
