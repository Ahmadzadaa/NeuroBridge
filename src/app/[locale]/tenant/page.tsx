import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  Award,
  BarChart3,
  ClipboardCheck,
  CreditCard,
  FileText,
  FolderKanban,
  Gamepad2,
  GraduationCap,
  Plus,
  Settings,
  TrendingUp,
  Users,
} from "lucide-react";
import { requireRole } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { getTenantFeatures } from "@/lib/tenant/features";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { InsetGroup, InsetRow, Reveal } from "@/components/ui/ios";
import {
  HeroAction,
  MetricGrid,
  MetricTile,
  ProgressRing,
  SectionHeader,
  SectionLink,
  ShortcutGrid,
  WelcomeHero,
  type ShortcutItem,
} from "@/components/dashboard/dashboard-kit";

/** The organisation's home: seats, programmes and how students are doing. */
export default async function TenantPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireRole(locale, ["TENANT_ADMIN", "TENANT_VIEWER"]);
  const tenantId = session.user.tenantId ?? "";

  const [t, tNav, features, tenant, programs, participants, certificates, runs, completedRuns] = await Promise.all([
    getTranslations("tenant.home"),
    getTranslations("nav.tenant"),
    getTenantFeatures(tenantId),
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true, seatLimit: true, seatsUsed: true } }),
    prisma.program.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, name: true, setupStatus: true, participantLimit: true, _count: { select: { participants: true } } },
    }),
    prisma.participant.count({ where: { program: { tenantId }, status: "ACTIVE" } }),
    prisma.certificate.count({ where: { tenantId } }),
    prisma.simulationRun.count({ where: { user: { tenantId } } }),
    prisma.simulationRun.count({ where: { user: { tenantId }, status: "COMPLETED" } }),
  ]);

  const seatLimit = tenant?.seatLimit ?? 0;
  const seatsUsed = tenant?.seatsUsed ?? 0;
  const seatPct = seatLimit ? (seatsUsed / seatLimit) * 100 : 0;
  const completion = runs ? Math.round((completedRuns / runs) * 100) : 0;
  const pending = programs.filter((p) => p.setupStatus === "PENDING_SETUP").length;
  const firstName = (session.user.name ?? "").split(" ")[0];

  const shortcuts: (ShortcutItem & { on?: boolean })[] = [
    { href: "/tenant/programs", icon: FolderKanban, tone: "indigo", label: tNav("programs") },
    { href: "/tenant/participants", icon: Users, tone: "violet", label: tNav("participants") },
    { href: "/tenant/assessments", icon: ClipboardCheck, tone: "sky", label: tNav("assessments") },
    { href: "/tenant/simulations", icon: Gamepad2, tone: "fuchsia", label: tNav("simulations"), on: features.simulations },
    { href: "/tenant/teachers", icon: GraduationCap, tone: "emerald", label: tNav("teachers"), on: features.teachers },
    { href: "/tenant/certificates", icon: Award, tone: "amber", label: tNav("certificates") },
    { href: "/tenant/reports", icon: BarChart3, tone: "rose", label: tNav("reports") },
    { href: "/tenant/settings", icon: Settings, tone: "slate", label: tNav("settings") },
  ];

  return (
    <DashboardLayout
      panel="tenant"
      title={tNav("dashboard")}
      userName={session.user.name ?? ""}
      seatUsage={{ used: seatsUsed, limit: seatLimit }}
    >
      <div className="mx-auto max-w-5xl space-y-8">
        <WelcomeHero
          eyebrow={tenant?.name}
          title={t("greeting", { name: firstName })}
          subtitle={pending ? t("pendingNote", { count: pending }) : t("subtitle")}
          aside={<ProgressRing value={seatPct} label={`${seatsUsed}/${seatLimit}`} caption={t("seats")} onDark responsive size={124} />}
        >
          <HeroAction href="/tenant/programs/buy" primary>
            <Plus className="h-4 w-4" aria-hidden="true" />
            {t("buyProgram")}
          </HeroAction>
          <HeroAction href="/tenant/participants">{t("viewParticipants")}</HeroAction>
        </WelcomeHero>

        <MetricGrid>
          <MetricTile index={1} icon={FolderKanban} tone="indigo" value={programs.length} label={tNav("programs")} href="/tenant/programs" />
          <MetricTile index={2} icon={Users} tone="violet" value={participants} label={t("activeStudents")} href="/tenant/participants" />
          <MetricTile index={3} icon={Award} tone="amber" value={certificates} label={tNav("certificates")} href="/tenant/certificates" />
          <MetricTile index={4} icon={TrendingUp} tone="emerald" value={`${completion}%`} label={t("simCompletion")} href="/tenant/analytics" />
        </MetricGrid>

        <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <Reveal as="section" index={5}>
            <SectionHeader title={tNav("programs")} action={<SectionLink href="/tenant/programs">{t("seeAll")}</SectionLink>} />
            <InsetGroup>
              {programs.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <p className="text-[14px] text-muted-foreground">{t("noPrograms")}</p>
                </div>
              ) : (
                programs.map((p) => {
                  const ready = p.setupStatus === "READY";
                  return (
                    <InsetRow
                      key={p.id}
                      href="/tenant/programs"
                      icon={FileText}
                      tone={ready ? "indigo" : "slate"}
                      title={p.name}
                      subtitle={ready ? t("students", { count: p._count.participants, limit: p.participantLimit }) : t("pendingSetup")}
                    />
                  );
                })
              )}
              <InsetRow href="/tenant/programs/buy" icon={Plus} tone="emerald" title={t("buyProgram")} />
            </InsetGroup>
          </Reveal>

          <Reveal as="section" index={6}>
            <SectionHeader title={t("seats")} />
            <InsetGroup footer={t("seatsFooter")}>
              <InsetRow icon={Users} tone="violet" title={t("seatsUsed")} value={seatsUsed} />
              <InsetRow icon={TrendingUp} tone="emerald" title={t("seatsLeft")} value={Math.max(seatLimit - seatsUsed, 0)} />
              <InsetRow icon={CreditCard} tone="sky" title={tNav("billing")} href="/tenant/billing" />
            </InsetGroup>
          </Reveal>
        </div>

        <Reveal as="section" index={7}>
          <SectionHeader title={t("shortcuts")} />
          <ShortcutGrid items={shortcuts.filter((s) => s.on !== false)} />
        </Reveal>
      </div>
    </DashboardLayout>
  );
}
