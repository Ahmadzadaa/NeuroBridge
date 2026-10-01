import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Building2, Globe, Inbox, Mail, Phone, Users } from "lucide-react";
import { requireRole } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { Link } from "@/i18n/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { LargeTitle } from "@/components/ui/ios";
import { formatDate } from "@/lib/format-date";
import { notificationRecipient } from "@/lib/leads/lead-service";
import { LEAD_STATUSES, type LeadStatus } from "@/lib/leads/lead-status";
import { cn } from "@/lib/utils";
import { LeadStatusSelect } from "./lead-status-select";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const PAGE_SIZE = 30;
const CARD = "rounded-[22px] bg-card ring-1 ring-border/60 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)]";
const LANGUAGE: Record<string, string> = { az: "Azərbaycan", en: "English", tr: "Türkçe" };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "superAdmin.leads" });
  return { title: `${t("title")} · BizSim` };
}

/**
 * Demo requests from the marketing site's form, newest first, with the sales
 * status the platform team moves them through. Every request is stored here
 * even when the notification email cannot be sent.
 */
export default async function LeadsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireRole(locale, ["SUPER_ADMIN"]);
  const t = await getTranslations("superAdmin.leads");

  const sp = await searchParams;
  const requested = typeof sp.status === "string" ? sp.status : "";
  const status = (LEAD_STATUSES as readonly string[]).includes(requested) ? (requested as LeadStatus) : null;
  const page = Math.max(1, Number(typeof sp.page === "string" ? sp.page : 1) || 1);
  const where = status ? { status } : {};

  const [counts, total, leads] = await Promise.all([
    prisma.lead.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.lead.count({ where }),
    prisma.lead.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: { id: true, name: true, company: true, email: true, phone: true, seatCount: true, message: true, locale: true, source: true, status: true, createdAt: true },
    }),
  ]);
  const countOf = (s: LeadStatus) => counts.find((c) => c.status === s)?._count._all ?? 0;
  const all = counts.reduce((n, c) => n + c._count._all, 0);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const time = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Baku" });
  const href = (next: { status?: LeadStatus | null; page?: number }) => {
    const q = new URLSearchParams();
    const s = next.status === undefined ? status : next.status;
    if (s) q.set("status", s);
    if (next.page && next.page > 1) q.set("page", String(next.page));
    const qs = q.toString();
    return `/super-admin/leads${qs ? `?${qs}` : ""}`;
  };

  const filters: { key: LeadStatus | null; label: string; count: number }[] = [
    { key: null, label: t("all"), count: all },
    ...LEAD_STATUSES.map((s) => ({ key: s, label: t(`status.${s}`), count: countOf(s) })),
  ];

  return (
    <DashboardLayout panel="super-admin" title={t("title")} userName={session.user.name ?? "Admin"}>
      <div className="mx-auto max-w-4xl space-y-6">
        <LargeTitle title={t("title")} subtitle={t("subtitle")} />

        {!notificationRecipient() && (
          <p className="rounded-2xl bg-amber-500/10 px-4 py-3 text-[13px] leading-relaxed text-foreground ring-1 ring-amber-500/30">
            {t("noEmailNote")}
          </p>
        )}

        <nav aria-label={t("filterLabel")} className="flex flex-wrap gap-2">
          {filters.map((f) => {
            const active = f.key === status;
            return (
              <Link
                key={f.key ?? "all"}
                href={href({ status: f.key, page: 1 })}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex h-9 items-center gap-2 rounded-full px-4 text-[13px] font-semibold transition-colors",
                  active ? "bg-primary text-primary-foreground" : "bg-card text-foreground ring-1 ring-border/60 hover:bg-muted/60"
                )}
              >
                {f.label}
                <span className={cn("rounded-full px-1.5 text-[11px] tabular-nums", active ? "bg-white/20" : "bg-muted text-muted-foreground")}>{f.count}</span>
              </Link>
            );
          })}
        </nav>

        {leads.length === 0 ? (
          <div className={cn(CARD, "flex flex-col items-center gap-3 px-4 py-14 text-center")}>
            <Inbox className="h-8 w-8 text-muted-foreground/60" aria-hidden="true" />
            <p className="text-[14px] text-muted-foreground">{status ? t("emptyFiltered") : t("empty")}</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {leads.map((lead, i) => (
              <li key={lead.id} style={{ "--i": i } as CSSProperties} className={cn(CARD, "ios-reveal p-4 sm:p-5", lead.status === "NEW" && "ring-primary/30")}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[16px] font-bold leading-tight text-foreground">{lead.name}</p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-[14px] text-muted-foreground">
                      <Building2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <span className="truncate">{lead.company}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[12px] tabular-nums text-muted-foreground">
                      {formatDate(lead.createdAt, locale, "medium")}, {time.format(lead.createdAt)}
                    </span>
                    <LeadStatusSelect id={lead.id} status={lead.status as LeadStatus} />
                  </div>
                </div>

                <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[13px]">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <dt className="sr-only">{t("email")}</dt>
                    <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <dd className="min-w-0 truncate">
                      <a href={`mailto:${lead.email}`} className="text-primary hover:underline">
                        {lead.email}
                      </a>
                    </dd>
                  </div>
                  {lead.phone && (
                    <div className="flex items-center gap-1.5">
                      <dt className="sr-only">{t("phone")}</dt>
                      <Phone className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                      <dd>
                        <a href={`tel:${lead.phone.replace(/[^\d+]/g, "")}`} className="text-primary hover:underline">
                          {lead.phone}
                        </a>
                      </dd>
                    </div>
                  )}
                  {lead.seatCount && (
                    <div className="flex items-center gap-1.5">
                      <dt className="sr-only">{t("seats")}</dt>
                      <Users className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                      <dd>{t("seatsValue", { count: lead.seatCount })}</dd>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <dt className="sr-only">{t("language")}</dt>
                    <Globe className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                    <dd>{LANGUAGE[lead.locale] ?? lead.locale}</dd>
                  </div>
                  {lead.source && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <dt>{t("source")}:</dt>
                      <dd>{lead.source}</dd>
                    </div>
                  )}
                </dl>

                {lead.message && (
                  <p className="mt-3 whitespace-pre-wrap break-words rounded-xl bg-muted/50 px-3 py-2.5 text-[14px] leading-relaxed text-foreground">{lead.message}</p>
                )}
              </li>
            ))}
          </ul>
        )}

        {pages > 1 && (
          <nav aria-label={t("pagination")} className="flex items-center justify-center gap-3 text-[13px]">
            {page > 1 && (
              <Link href={href({ page: page - 1 })} className="rounded-full px-3 py-1.5 font-semibold text-primary hover:bg-muted">
                ← {t("previous")}
              </Link>
            )}
            <span className="tabular-nums text-muted-foreground">{t("pageOf", { page, pages })}</span>
            {page < pages && (
              <Link href={href({ page: page + 1 })} className="rounded-full px-3 py-1.5 font-semibold text-primary hover:bg-muted">
                {t("next")} →
              </Link>
            )}
          </nav>
        )}
      </div>
    </DashboardLayout>
  );
}
