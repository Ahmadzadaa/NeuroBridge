import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { Building2, Mail, MonitorSmartphone, Phone, ShieldAlert, ShieldCheck } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { InsetGroup } from "@/components/ui/ios";
import { UserAvatar } from "@/components/ui/user-avatar";
import { formatDate } from "@/lib/format-date";
import { describeUserAgent, parseContext } from "@/lib/support/client-context";
import { getTicketInspector, personName } from "@/lib/support/support-service";
import { cn } from "@/lib/utils";
import { InspectorTabs } from "./inspector-tabs";
import { CopyButton, SeatLimitEditor, TenantModuleSwitches, TenantStatusButton, UnlockUserButton } from "./inspector-controls";

/** A label on the left, a value on the right: one line of an iOS settings list. */
function Row({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex min-h-[44px] items-center justify-between gap-3 px-4 py-2", className)}>
      <span className="shrink-0 text-[14px] text-muted-foreground">{label}</span>
      <span className="flex min-w-0 items-center justify-end gap-1 text-right text-[14px] font-medium text-foreground">{children}</span>
    </div>
  );
}

const TENANT_STATUS_TONE: Record<string, string> = {
  ACTIVE: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400",
  INACTIVE: "bg-destructive/10 text-destructive",
  PENDING: "bg-amber-500/12 text-amber-700 dark:text-amber-400",
};

/**
 * Everything beside a support conversation: who wrote it, their organisation
 * (with the switches most requests end up needing) and the technical details
 * of the browser it came from.
 */
export async function TicketInspector({ ticketId, locale }: { ticketId: string; locale: string }) {
  const data = await getTicketInspector(ticketId);
  if (!data) return null;
  const t = await getTranslations("support.inspector");
  const tc = await getTranslations("common");
  const tt = await getTranslations("superAdmin.tenants.tenantTypes");
  const { createdBy: user, tenant } = data;
  const name = personName(user);
  const time = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Baku",
  });
  const when = (d: Date) => `${formatDate(d, locale, "medium")}, ${time.format(d)}`;
  const locked = user.lockedUntil !== null && user.lockedUntil > new Date();
  const ctx = parseContext(data.context);
  const ua = describeUserAgent(ctx?.userAgent);
  const sub = tenant.subscription;
  const tenantStatus = tenant.status === "ACTIVE" ? tc("active") : tenant.status === "INACTIVE" ? tc("inactive") : tc("pending");

  return (
    <aside className="space-y-6" aria-label={t("label")}>
      {/* Contact card */}
      <section className="ios-reveal flex flex-col items-center rounded-[22px] bg-card px-5 pb-5 pt-6 text-center ring-1 ring-border/60 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)]">
        <UserAvatar userId={user.id} name={name} hasAvatar={Boolean(user.avatarPath)} className="h-16 w-16 text-[22px]" />
        <p className="mt-3 text-[18px] font-bold leading-tight tracking-[-0.3px]">{name}</p>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          {t(`roles.${user.role}`)} · {tenant.name}
        </p>
        <div className="mt-4 grid w-full grid-cols-2 gap-2">
          <a
            href={`mailto:${user.email}`}
            className="flex flex-col items-center gap-1 rounded-2xl bg-primary/10 py-2.5 text-[12px] font-semibold text-primary transition-colors hover:bg-primary/15"
          >
            <Mail className="h-[18px] w-[18px]" aria-hidden="true" />
            {t("email")}
          </a>
          {user.phone ? (
            <a
              href={`tel:${user.phone}`}
              className="flex flex-col items-center gap-1 rounded-2xl bg-primary/10 py-2.5 text-[12px] font-semibold text-primary transition-colors hover:bg-primary/15"
            >
              <Phone className="h-[18px] w-[18px]" aria-hidden="true" />
              {t("call")}
            </a>
          ) : (
            <span className="flex flex-col items-center gap-1 rounded-2xl bg-muted py-2.5 text-[12px] font-semibold text-muted-foreground">
              <Phone className="h-[18px] w-[18px]" aria-hidden="true" />
              {t("noPhone")}
            </span>
          )}
        </div>
      </section>

      <InspectorTabs
        label={t("label")}
        tabs={[
          {
            key: "person",
            label: t("tabPerson"),
            content: (
              <>
                <InsetGroup header={t("account")}>
                  <Row label={t("emailLabel")}>
                    <span className="truncate">{user.email}</span>
                    <CopyButton value={user.email} label={t("copyEmail")} />
                  </Row>
                  {user.phone && <Row label={t("phone")}>{user.phone}</Row>}
                  <Row label={t("language")}>{user.language.toUpperCase()}</Row>
                  <Row label={t("joined")}>{formatDate(user.createdAt, locale, "medium")}</Row>
                  <Row label={t("lastLogin")}>{data.lastLogin ? when(data.lastLogin.createdAt) : t("never")}</Row>
                  <Row label={t("twoFactor")}>
                    {user.twoFactorEnabled ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                        <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                        {t("on")}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">{t("off")}</span>
                    )}
                  </Row>
                  {locked || user.failedLoginAttempts > 0 ? (
                    <div className="flex items-center justify-between gap-3 bg-amber-500/8 px-4 py-2.5">
                      <span className="flex min-w-0 items-center gap-2 text-[14px] text-foreground">
                        <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
                        <span className="min-w-0">
                          {locked
                            ? t("locked", {
                                until: time.format(user.lockedUntil!),
                              })
                            : t("failedAttempts", {
                                count: user.failedLoginAttempts,
                              })}
                        </span>
                      </span>
                      <UnlockUserButton userId={user.id} />
                    </div>
                  ) : (
                    <Row label={t("signIn")}>{t("signInOk")}</Row>
                  )}
                </InsetGroup>

                <InsetGroup
                  header={t("activity")}
                  action={
                    <Link href="/super-admin/audit" className="text-[13px] font-medium text-primary hover:underline">
                      {t("auditLog")}
                    </Link>
                  }
                >
                  {data.recent.length === 0 ? (
                    <p className="px-4 py-3 text-[14px] text-muted-foreground">{t("noActivity")}</p>
                  ) : (
                    data.recent.map((entry) => (
                      <div key={entry.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                        <code className="min-w-0 truncate font-mono text-[12px] text-foreground">{entry.action}</code>
                        <span className="shrink-0 text-[12px] tabular-nums text-muted-foreground">{when(entry.createdAt)}</span>
                      </div>
                    ))
                  )}
                </InsetGroup>
              </>
            ),
          },
          {
            key: "organisation",
            label: t("tabOrganisation"),
            content: (
              <>
                <InsetGroup header={t("organisation")}>
                  <div className="flex items-center gap-3 px-4 py-3">
                    <span
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px] bg-gradient-to-br from-indigo-500 to-violet-600 text-white"
                      aria-hidden="true"
                    >
                      <Building2 className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-semibold">{tenant.name}</span>
                      <span className="block text-[13px] text-muted-foreground">{tt(tenant.tenantType as "UNIVERSITY")}</span>
                    </span>
                    <span className={cn("rounded-full px-2.5 py-1 text-[12px] font-semibold", TENANT_STATUS_TONE[tenant.status] ?? TENANT_STATUS_TONE.PENDING)}>
                      {tenantStatus}
                    </span>
                  </div>
                  <Row label={t("subscription")}>
                    {sub ? (
                      <span>
                        {t(`subscriptionStatus.${sub.status}`)}
                        <span className="font-normal text-muted-foreground">
                          {" · "}
                          {t("until", {
                            date: formatDate(sub.status === "TRIALING" && sub.trialEndsAt ? sub.trialEndsAt : sub.currentPeriodEnd, locale, "medium"),
                          })}
                        </span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground">{t("noSubscription")}</span>
                    )}
                  </Row>
                  <Row label={t("users")}>{tenant._count.users}</Row>
                  <Row label={t("requests")}>{tenant._count.supportTickets}</Row>
                  {tenant.email && (
                    <Row label={t("orgEmail")}>
                      <span className="truncate">{tenant.email}</span>
                    </Row>
                  )}
                  <SeatLimitEditor tenantId={tenant.id} seatLimit={tenant.seatLimit} seatsUsed={tenant.seatsUsed} />
                </InsetGroup>

                <InsetGroup header={t("modules")} footer={t("modulesHint")}>
                  <TenantModuleSwitches
                    tenantId={tenant.id}
                    modules={{
                      teachers: tenant.teachersEnabled,
                      hackathon: tenant.hackathonEnabled,
                      simulations: tenant.simulationsEnabled,
                      trainings: tenant.trainingsEnabled,
                      aiTools: tenant.aiToolsEnabled,
                    }}
                  />
                </InsetGroup>

                <InsetGroup footer={tenant.status === "ACTIVE" ? t("suspendHint") : undefined}>
                  <TenantStatusButton tenantId={tenant.id} status={tenant.status} />
                </InsetGroup>
              </>
            ),
          },
          {
            key: "technical",
            label: t("tabTechnical"),
            content: (
              <>
                <InsetGroup header={t("technical")} footer={ctx?.userAgent ? undefined : t("noContext")}>
                  <Row label={t("browser")}>{ua.browser ?? "—"}</Row>
                  <Row label={t("os")}>{ua.os ?? "—"}</Row>
                  <Row label={t("device")}>
                    <MonitorSmartphone className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    {ctx?.userAgent ? (ua.mobile ? t("mobile") : t("desktop")) : "—"}
                  </Row>
                  <Row label={t("screen")}>{ctx?.screen ? `${ctx.screen}${ctx.viewport ? ` · ${ctx.viewport}` : ""}` : "—"}</Row>
                  <Row label={t("timezone")}>{ctx?.timezone ?? "—"}</Row>
                  <Row label={t("browserLanguage")}>{ctx?.language ?? "—"}</Row>
                  <Row label={t("ticketId")}>
                    <code className="truncate font-mono text-[12px]">{data.id}</code>
                    <CopyButton value={data.id} label={t("copyId")} />
                  </Row>
                  {ctx?.userAgent && (
                    <details className="group px-4 py-2.5">
                      <summary className="cursor-pointer text-[13px] font-medium text-primary marker:text-muted-foreground">{t("userAgent")}</summary>
                      <p className="mt-2 break-all font-mono text-[11px] leading-relaxed text-muted-foreground">{ctx.userAgent}</p>
                    </details>
                  )}
                </InsetGroup>
              </>
            ),
          },
        ]}
      />
    </aside>
  );
}
