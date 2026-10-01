import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  Activity,
  Building2,
  CircleDashed,
  ClipboardList,
  CreditCard,
  FolderKanban,
  Headphones,
  Plus,
  Receipt,
  Tag,
  Users,
  Wallet,
} from "lucide-react";
import { requireRole } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { formatKurus } from "@/lib/billing/money";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { InsetGroup, InsetRow, Reveal } from "@/components/ui/ios";
import {
  HeroAction,
  MetricGrid,
  MetricTile,
  SectionHeader,
  SectionLink,
  ShortcutGrid,
  WelcomeHero,
  type ShortcutItem,
} from "@/components/dashboard/dashboard-kit";
import { formatDate } from "@/lib/format-date";

const INTL: Record<string, string> = { tr: "tr-TR", en: "en-GB", az: "tr-TR" };
const MONTHS = 6;

/** Platform overview from live data: customers, paid orders and work waiting on the team. */
export default async function SuperAdminPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireRole(locale, ["SUPER_ADMIN"]);

  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const windowStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (MONTHS - 1), 1));

  const [t, tNav, tenants, newTenants, students, paidOrders, revenue, recentOrders, pending] = await Promise.all([
    getTranslations("superAdmin.home"),
    getTranslations("nav.superAdmin"),
    prisma.tenant.count(),
    prisma.tenant.count({ where: { createdAt: { gte: monthStart } } }),
    prisma.user.count({ where: { role: "PARTICIPANT" } }),
    prisma.order.findMany({
      where: { status: "PAID", paidAt: { gte: windowStart } },
      select: { total: true, paidAt: true },
    }),
    prisma.order.aggregate({ where: { status: "PAID" }, _sum: { total: true } }),
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, institutionName: true, kind: true, status: true, total: true, currency: true, createdAt: true },
    }),
    prisma.program.findMany({
      where: { setupStatus: "PENDING_SETUP" },
      orderBy: { createdAt: "asc" },
      take: 5,
      select: { id: true, name: true, tenant: { select: { name: true } } },
    }),
  ]);

  const nf = INTL[locale] ?? "tr-TR";
  // Tiles and bars show whole lira; the order list keeps exact amounts.
  const whole = new Intl.NumberFormat(nf, { style: "currency", currency: "TRY", maximumFractionDigits: 0 });
  const money = (kurus: number) => whole.format(kurus / 100);
  const monthFmt = { format: (value: Date | string) => formatDate(value, locale, "monthShort") };
  const months = Array.from({ length: MONTHS }, (_, i) => {
    const start = new Date(Date.UTC(windowStart.getUTCFullYear(), windowStart.getUTCMonth() + i, 1));
    const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
    const total = paidOrders.filter((o) => o.paidAt && o.paidAt >= start && o.paidAt < end).reduce((s, o) => s + o.total, 0);
    return { label: monthFmt.format(start), total };
  });
  const thisMonth = months[months.length - 1].total;
  const peak = Math.max(...months.map((m) => m.total), 1);
  const firstName = (session.user.name ?? "").split(" ")[0];

  const shortcuts: ShortcutItem[] = [
    { href: "/super-admin/tenants", icon: Building2, tone: "indigo", label: tNav("tenants") },
    { href: "/super-admin/programs", icon: FolderKanban, tone: "violet", label: tNav("programs") },
    { href: "/super-admin/billing", icon: CreditCard, tone: "emerald", label: tNav("billing") },
    { href: "/super-admin/pricing", icon: Tag, tone: "amber", label: tNav("pricing") },
    { href: "/super-admin/support", icon: Headphones, tone: "sky", label: tNav("support") },
    { href: "/super-admin/system", icon: Activity, tone: "rose", label: tNav("system") },
    { href: "/super-admin/audit", icon: ClipboardList, tone: "slate", label: tNav("audit") },
  ];

  return (
    <DashboardLayout panel="super-admin" title={tNav("dashboard")} userName={session.user.name ?? "Admin"}>
      <div className="mx-auto max-w-5xl space-y-8">
        <WelcomeHero
          eyebrow="BizSim"
          title={t("greeting", { name: firstName })}
          subtitle={pending.length ? t("pendingNote", { count: pending.length }) : t("subtitle")}
        >
          {pending.length > 0 && (
            <HeroAction href="/super-admin/programs" primary>
              {t("reviewPending")}
            </HeroAction>
          )}
          <HeroAction href="/super-admin/programs/new">
            <Plus className="h-4 w-4" aria-hidden="true" />
            {t("newProgram")}
          </HeroAction>
        </WelcomeHero>

        <MetricGrid>
          <MetricTile
            index={1}
            icon={Building2}
            tone="indigo"
            value={tenants}
            label={t("tenants")}
            footnote={t("newThisMonth", { count: newTenants })}
            href="/super-admin/tenants"
          />
          <MetricTile index={2} icon={Users} tone="violet" value={students.toLocaleString(nf)} label={t("students")} />
          <MetricTile index={3} icon={Wallet} tone="emerald" value={money(revenue._sum.total ?? 0)} label={t("revenue")} href="/super-admin/billing" />
          <MetricTile index={4} icon={Receipt} tone="amber" value={money(thisMonth)} label={t("thisMonth")} href="/super-admin/billing" />
        </MetricGrid>

        <Reveal as="section" index={5}>
          <SectionHeader title={t("revenueChart")} />
          <div className="rounded-[22px] bg-card p-5 ring-1 ring-border/60 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)]">
            <ol className="flex h-48 items-end gap-2 sm:gap-4" aria-label={t("revenueChart")}>
              {months.map((m, i) => (
                <li key={m.label} className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2">
                  <span className="text-[11px] font-medium tabular-nums text-muted-foreground sm:text-[12px]">
                    {m.total ? money(m.total) : ""}
                  </span>
                  <span
                    className="bar-grow w-full max-w-14 rounded-t-[6px] bg-gradient-to-t from-indigo-500 to-violet-500 transition-[filter] group-hover:brightness-110"
                    style={{ height: `${Math.max((m.total / peak) * 100, m.total ? 4 : 1.5)}%`, animationDelay: `${i * 60}ms` }}
                    title={`${m.label}: ${money(m.total)}`}
                  />
                  <span className={`text-[12px] ${i === months.length - 1 ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                    {m.label}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </Reveal>

        <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-2">
          <Reveal as="section" index={6}>
            <SectionHeader title={t("pendingPrograms")} action={<SectionLink href="/super-admin/programs">{t("seeAll")}</SectionLink>} />
            <InsetGroup>
              {pending.length === 0 ? (
                <p className="px-4 py-8 text-center text-[14px] text-muted-foreground">{t("noPending")}</p>
              ) : (
                pending.map((p) => (
                  <InsetRow
                    key={p.id}
                    href={`/super-admin/programs/${p.id}`}
                    icon={CircleDashed}
                    tone="amber"
                    title={p.tenant.name}
                    subtitle={p.name}
                  />
                ))
              )}
            </InsetGroup>
          </Reveal>

          <Reveal as="section" index={7}>
            <SectionHeader title={t("recentOrders")} action={<SectionLink href="/super-admin/billing">{t("seeAll")}</SectionLink>} />
            <InsetGroup>
              {recentOrders.length === 0 ? (
                <p className="px-4 py-8 text-center text-[14px] text-muted-foreground">{t("noOrders")}</p>
              ) : (
                recentOrders.map((o) => (
                  <InsetRow
                    key={o.id}
                    icon={Receipt}
                    tone={o.status === "PAID" ? "emerald" : o.status === "FAILED" ? "rose" : "slate"}
                    title={o.institutionName}
                    subtitle={`${t(`kind.${o.kind === "ADD_PROGRAM" ? "ADD_PROGRAM" : "NEW_TENANT"}`)} · ${t(`status.${o.status === "PAID" || o.status === "FAILED" ? o.status : "PENDING"}`)}`}
                    value={<span className="tabular-nums">{formatKurus(o.total, o.currency, nf)}</span>}
                  />
                ))
              )}
            </InsetGroup>
          </Reveal>
        </div>

        <Reveal as="section" index={8}>
          <SectionHeader title={t("shortcuts")} />
          <ShortcutGrid items={shortcuts} />
        </Reveal>
      </div>
    </DashboardLayout>
  );
}
