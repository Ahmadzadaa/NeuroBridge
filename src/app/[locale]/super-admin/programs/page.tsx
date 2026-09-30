import { getTranslations, setRequestLocale } from "next-intl/server";
import { CircleDashed, FolderKanban, Plus } from "lucide-react";
import { requireRole } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { Link } from "@/i18n/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { buttonVariants } from "@/components/ui/button";
import { InsetGroup, InsetRow, LargeTitle, Reveal } from "@/components/ui/ios";

/** Every organisation's programmes; the paid-but-unbuilt ones come first. */
export default async function SuperAdminProgramsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireRole(locale, ["SUPER_ADMIN"]);
  const t = await getTranslations("superAdmin.programs");

  const programs = await prisma.program.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      setupStatus: true,
      createdAt: true,
      tenant: { select: { name: true } },
      _count: { select: { participants: true } },
    },
  });
  const pending = programs.filter((p) => p.setupStatus === "PENDING_SETUP");
  const date = new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeZone: "UTC" });

  return (
    <DashboardLayout panel="super-admin" title={t("title")} userName={session.user.name ?? "Admin"}>
      <div className="mx-auto max-w-3xl space-y-8">
        <LargeTitle
          title={t("title")}
          subtitle={t("subtitle")}
          actions={
            <Link href="/super-admin/programs/new" className={buttonVariants({ size: "lg" })}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              {t("new")}
            </Link>
          }
        />

        {pending.length > 0 && (
          <Reveal index={1}>
            <InsetGroup header={`${t("pendingHeading")} · ${pending.length}`} footer={t("pendingFooter")}>
              {pending.map((p) => (
                <InsetRow
                  key={p.id}
                  href={`/super-admin/programs/${p.id}`}
                  icon={CircleDashed}
                  tone="amber"
                  title={p.tenant.name}
                  subtitle={`${p.name} · ${date.format(p.createdAt)}`}
                  trailing={
                    <span className="rounded-full bg-warning/15 px-2.5 py-0.5 text-[12px] font-semibold text-warning-dark">
                      {t("statusPending")}
                    </span>
                  }
                />
              ))}
            </InsetGroup>
          </Reveal>
        )}

        <Reveal index={2}>
          <InsetGroup header={t("allHeading")}>
            {programs.length === 0 ? (
              <p className="px-4 py-8 text-center text-[14px] text-muted-foreground">{t("empty")}</p>
            ) : (
              programs.map((p) => (
                <InsetRow
                  key={p.id}
                  href={`/super-admin/programs/${p.id}`}
                  icon={FolderKanban}
                  tone={p.setupStatus === "PENDING_SETUP" ? "slate" : "violet"}
                  title={p.name}
                  subtitle={`${p.tenant.name} · ${t("participants", { count: p._count.participants })}`}
                  value={p.setupStatus === "PENDING_SETUP" ? t("statusPending") : t("statusReady")}
                />
              ))
            )}
          </InsetGroup>
        </Reveal>
      </div>
    </DashboardLayout>
  );
}
