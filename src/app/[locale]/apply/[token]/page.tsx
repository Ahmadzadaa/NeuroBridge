import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  getProgramByApplicationToken,
  registrationAvailability,
} from "@/lib/seats/registration-service";
import { listDepartments, listUniversities } from "@/lib/reference/academic-lists";
import { noticesFor } from "@/lib/consent/notices";
import { AuthShell, Sheet } from "@/components/layout/auth-shell";
import { IconTile } from "@/components/ui/ios";
import { CalendarX2, GraduationCap } from "lucide-react";
import { ApplyForm } from "./apply-form";

type Params = { params: Promise<{ locale: string; token: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "apply" });
  return { title: `${t("title")} · BizSim` };
}

/** Screen 01 — student info entry, the first thing a program link opens. */
export default async function ApplyPage({ params }: Params) {
  const { locale, token } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("apply");
  const program = await getProgramByApplicationToken(token);

  if (!program) {
    return (
      <AuthShell width="sm">
        <Sheet className="text-center">
          <IconTile icon={CalendarX2} tone="slate" size="lg" className="mx-auto" />
          <h1 className="mt-4 text-[22px] font-bold tracking-[-0.5px] text-foreground">{t("notFound")}</h1>
          <p className="mt-2 text-[15px] text-muted-foreground">{t("notFoundHint")}</p>
        </Sheet>
      </AuthShell>
    );
  }

  const availability = registrationAvailability(program);
  const closedReason = !availability.registrationOpen
    ? t("closed")
    : !availability.seatsAvailable
      ? t("seatsFull")
      : !availability.programCapacityAvailable
        ? t("programFull")
        : null;

  const [universities, departments] = closedReason
    ? [[], []]
    : await Promise.all([listUniversities(program.tenantId), listDepartments(program.tenantId)]);

  return (
    <AuthShell>
      <div className="ios-reveal mb-6 flex items-center gap-4 px-1">
        <IconTile icon={GraduationCap} tone="violet" size="lg" />
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-primary">{program.tenant.name}</p>
          <h1 className="text-[24px] font-bold leading-tight tracking-[-0.6px] text-foreground sm:text-[30px]">{program.name}</h1>
        </div>
      </div>
      <Sheet>
      <p className="text-[15px] leading-relaxed text-muted-foreground">{t("intro")}</p>
      {closedReason ? (
        <p role="alert" className="mt-6 rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {closedReason}
        </p>
      ) : (
        <ApplyForm
          token={token}
          locale={locale}
          universities={universities}
          departments={departments}
          notices={noticesFor(locale)}
        />
      )}
      </Sheet>
    </AuthShell>
  );
}
