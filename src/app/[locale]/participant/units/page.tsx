import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireRole } from "@/lib/auth-utils";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Link } from "@/i18n/navigation";
import { CheckCircle2, ChevronRight, Circle } from "lucide-react";
import { ProgressRing, WelcomeHero } from "@/components/dashboard/dashboard-kit";
import { listUnits } from "@/lib/training/units-service";

type Params = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "units" });
  return { title: `${t("title")} · BizSim` };
}

/** The simulation's training units with per-step progress and points. */
export default async function UnitsPage({ params }: Params) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireRole(locale, ["PARTICIPANT"]);
  const t = await getTranslations("units");
  const data = await listUnits(session.user.id, locale);
  const userName = session.user.name ?? "";

  if (!data) {
    return (
      <DashboardLayout panel="participant" title={t("title")} userName={userName}>
        <p className="text-muted-foreground">{t("notInProgram")}</p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout panel="participant" title={data.title} userName={userName}>
      <div className="mx-auto max-w-3xl space-y-6">
        <WelcomeHero
          eyebrow={t("title")}
          title={data.title}
          subtitle={t("intro")}
          aside={
            <ProgressRing
              value={data.total ? (data.earned / data.total) * 100 : 0}
              label={String(data.earned)}
              caption={t("pointsOf", { total: data.total })}
              onDark
              responsive
              size={124}
            />
          }
        />
        <ol className="space-y-3">
          {data.units.map((u, i) => {
            const complete = u.videoDone && u.projectDone && u.testPassed;
            return (
              <li key={u.id} className="ios-reveal" style={{ "--i": i + 1 } as React.CSSProperties}>
                <Link
                  href={`/participant/units/${u.id}`}
                  className="group flex items-center gap-4 rounded-[22px] bg-card p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)] ring-1 ring-border/60 transition-transform duration-300 hover:-translate-y-0.5 sm:p-5"
                >
                  <span
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] text-[18px] font-bold ${
                      complete
                        ? "bg-gradient-to-br from-emerald-400 to-teal-600 text-white"
                        : "bg-gradient-to-br from-indigo-500 to-violet-600 text-white"
                    }`}
                    aria-hidden="true"
                  >
                    {complete ? <CheckCircle2 className="h-6 w-6" /> : u.order}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-medium text-muted-foreground">{t("unitN", { n: u.order })}</p>
                    <h2 className="truncate text-[16px] font-semibold tracking-[-0.2px] text-foreground">{u.title}</h2>
                    <ul className="mt-2 flex flex-wrap gap-1.5 text-[12px]">
                      <Step done={u.videoDone} label={t("steps.video")} />
                      <Step done={u.projectDone} label={t("steps.project")} />
                      <Step
                        done={u.testPassed}
                        label={u.testScore === null ? t("steps.test") : t("steps.testScore", { score: u.testScore })}
                      />
                    </ul>
                  </div>
                  <div className="hidden shrink-0 text-right sm:block">
                    <p className="text-[17px] font-bold tabular-nums text-foreground">{u.earned}</p>
                    <p className="text-[11px] text-muted-foreground">/ {u.points}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </Link>
              </li>
            );
          })}
        </ol>
      </div>
    </DashboardLayout>
  );
}

function Step({ done, label }: { done: boolean; label: string }) {
  return (
    <li
      className={
        done
          ? "inline-flex items-center gap-1 rounded-full bg-success/12 px-2.5 py-0.5 font-medium text-success"
          : "inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-muted-foreground"
      }
    >
      {done ? <CheckCircle2 className="h-3 w-3" aria-hidden="true" /> : <Circle className="h-3 w-3" aria-hidden="true" />}
      {label}
    </li>
  );
}
