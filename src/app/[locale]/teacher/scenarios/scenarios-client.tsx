"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { FileText, Gamepad2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { LargeTitle } from "@/components/ui/ios";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { formatSimMoney } from "@/lib/simulation/money";

interface ScenarioRow {
  id: string;
  name: string;
  description: string | null;
  startCash: number;
  targetCash: number;
  roundCount: number;
  runCount: number;
}

interface ScenariosListClientProps {
  locale: string;
  userName: string;
  scenarios: ScenarioRow[];
}

export function ScenariosListClient({
  locale,
  userName,
  scenarios,
}: ScenariosListClientProps) {
  const t = useTranslations("teacher.scenarios");
  const tc = useTranslations("common");
  const router = useRouter();

  async function remove(id: string) {
    try {
      const res = await fetch(`/api/scenarios/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success(t("deleted"));
      router.refresh();
    } catch {
      toast.error(tc("error"));
    }
  }

  return (
    <DashboardLayout panel="teacher" title={t("title")} userName={userName}>
      <LargeTitle
        className="mb-6"
        title={t("title")}
        subtitle={t("subtitle")}
        actions={
          <Button size="lg" nativeButton={false} render={<Link href={`/${locale}/teacher/scenarios/new`} />}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            {t("create")}
          </Button>
        }
      />

      {scenarios.length === 0 ? (
        <div className="rounded-[22px] bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)] ring-1 ring-border/60">
          <EmptyState title={tc("noData")} description={t("empty")} />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {scenarios.map((scenario) => (
            <div
              key={scenario.id}
              className="group rounded-[22px] bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)] ring-1 ring-border/60 p-6 ring-1 ring-transparent transition-all hover:ring-primary/15"
            >
              <div className="flex items-start justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <FileText className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={tc("edit")}
                    className="rounded-lg"
                    nativeButton={false}
                    render={
                      <Link
                        href={`/${locale}/teacher/scenarios/${scenario.id}`}
                      />
                    }
                  >
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={tc("delete")}
                    className="rounded-lg hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => remove(scenario.id)}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
              <h3 className="mt-3 text-[15px] font-semibold leading-snug">
                {scenario.name}
              </h3>
              {scenario.description && (
                <p className="mt-1 line-clamp-2 text-[13px] text-muted-foreground">
                  {scenario.description}
                </p>
              )}
              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-muted-foreground">
                <span>{t("roundCount", { count: scenario.roundCount })}</span>
                <span className="flex items-center gap-1">
                  <Gamepad2 className="h-3.5 w-3.5" aria-hidden="true" />
                  {t("runCount", { count: scenario.runCount })}
                </span>
                <span>
                  {formatSimMoney(scenario.startCash, locale)} → {formatSimMoney(scenario.targetCash, locale)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
