import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Bot, ChevronRight, ShieldCheck } from "lucide-react";
import { requireRole } from "@/lib/auth-utils";
import { requireFeature } from "@/lib/tenant/require-feature";
import { prisma } from "@/lib/prisma";
import { localized } from "@/lib/i18n-content";
import { Link } from "@/i18n/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { IconTile, LargeTitle, Reveal } from "@/components/ui/ios";
import { loadAiConfig } from "@/ai/config";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "mentor.hub" });
  return { title: `${t("title")} · BizSim` };
}

/**
 * The mentor always works inside a simulation, where it knows the stage and
 * the participant's decisions. This page explains that and lists the
 * simulations of the participant's programmes, each opening with the mentor.
 */
export default async function MentorHubPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireRole(locale, ["PARTICIPANT"]);
  await requireFeature(session.user.tenantId, "aiTools");
  const t = await getTranslations("mentor.hub");
  const tenantId = session.user.tenantId ?? "__none__";

  const assigned = await prisma.programSimulation.findMany({
    where: { program: { tenantId, participants: { some: { userId: session.user.id, status: "ACTIVE" } } } },
    select: { simulationType: true },
  });
  const simulations = await prisma.simulation.findMany({
    where: { OR: [{ tenantId: null, key: { in: [...new Set(assigned.map((a) => a.simulationType))] } }, { tenantId }] },
    select: { id: true, key: true, nameAz: true, nameEn: true, nameTr: true, _count: { select: { rounds: true } } },
    orderBy: { key: "asc" },
  });
  const items = simulations
    .filter((s) => s._count.rounds > 0 || s.key === "idea_development")
    .map((s) => ({
      id: s.id,
      name: localized(s, "name", locale),
      href: s.key === "idea_development" ? "/participant/units" : `/participant/simulations/${s.id}`,
    }));

  return (
    <DashboardLayout panel="participant" title={t("title")} userName={session.user.name ?? ""}>
      <div className="mx-auto max-w-3xl space-y-6">
        <LargeTitle title={t("title")} subtitle={t("subtitle")} />
        {!loadAiConfig().enabled && (
          <p className="rounded-2xl bg-muted px-4 py-3 text-[14px] text-muted-foreground">{t("disabled")}</p>
        )}
        <Reveal index={1} className="flex items-start gap-3 rounded-[22px] bg-primary/5 p-4 ring-1 ring-primary/20">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
          <p className="text-[14px] leading-relaxed text-foreground">{t("notice")}</p>
        </Reveal>
        {items.length === 0 ? (
          <p className="rounded-[22px] bg-card px-4 py-10 text-center text-[14px] text-muted-foreground ring-1 ring-border/60">{t("empty")}</p>
        ) : (
          <ul className="overflow-hidden rounded-[22px] bg-card ring-1 ring-border/60">
            {items.map((item, i) => (
              <li key={item.id} className={i > 0 ? "border-t border-border/60" : undefined}>
                <Link href={item.href} className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted/50">
                  <IconTile icon={Bot} tone="violet" size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-semibold">{item.name}</span>
                    <span className="block text-[13px] text-muted-foreground">{t("openWithMentor")}</span>
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/60" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </DashboardLayout>
  );
}
