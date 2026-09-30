import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  getProgramByApplicationToken,
  registrationAvailability,
} from "@/lib/seats/registration-service";
import { listDepartments, listUniversities } from "@/lib/reference/academic-lists";
import { noticesFor } from "@/lib/consent/notices";
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
      <Shell>
        <h1 className="text-xl font-bold text-foreground">{t("notFound")}</h1>
      </Shell>
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
    <Shell>
      <p className="text-sm font-medium text-primary">{program.tenant.name}</p>
      <h1 className="mt-1 text-xl font-bold text-foreground sm:text-2xl">{program.name}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("intro")}</p>
      {closedReason ? (
        <p role="alert" className="mt-6 text-sm text-destructive">
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
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background px-4 py-10 sm:py-16">
      <div className="mx-auto w-full max-w-2xl rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-8">
        {children}
      </div>
    </div>
  );
}
