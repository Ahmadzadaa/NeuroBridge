import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireRole } from "@/lib/auth-utils";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Link } from "@/i18n/navigation";
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
      <div className="mx-auto max-w-3xl space-y-4">
        <p className="text-sm text-muted-foreground">{t("intro")}</p>
        <p className="text-sm font-medium text-foreground">{t("pointsSummary", { earned: data.earned, total: data.total })}</p>
        <ol className="space-y-3">
          {data.units.map((u) => (
            <li key={u.id}>
              <Link
                href={`/participant/units/${u.id}`}
                className="block rounded-2xl bg-card p-5 shadow-sm transition-colors hover:bg-accent/50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">{t("unitN", { n: u.order })}</p>
                    <h2 className="mt-0.5 font-semibold text-foreground">{u.title}</h2>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-foreground">
                    {t("points", { earned: u.earned, total: u.points })}
                  </span>
                </div>
                <ul className="mt-3 flex flex-wrap gap-2 text-xs">
                  <Step done={u.videoDone} label={t("steps.video")} />
                  <Step done={u.projectDone} label={t("steps.project")} />
                  <Step
                    done={u.testPassed}
                    label={u.testScore === null ? t("steps.test") : t("steps.testScore", { score: u.testScore })}
                  />
                </ul>
              </Link>
            </li>
          ))}
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
          ? "rounded-full bg-success/10 px-2.5 py-1 font-medium text-success"
          : "rounded-full bg-subtle px-2.5 py-1 text-muted-foreground"
      }
    >
      {done ? "✓ " : "○ "}
      {label}
    </li>
  );
}
