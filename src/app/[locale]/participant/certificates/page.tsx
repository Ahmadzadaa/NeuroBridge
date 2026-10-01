import { setRequestLocale } from "next-intl/server";
import { requireRole } from "@/lib/auth-utils";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { getTranslations } from "next-intl/server";
import { Award } from "lucide-react";
import { LargeTitle } from "@/components/ui/ios";
import { listUserCertificates } from "@/lib/certificates/certificate-service";
import { Download, ShieldOff } from "lucide-react";

export default async function CertificatesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireRole(locale, ["PARTICIPANT"]);
  const t = await getTranslations("participant");
  const tc = await getTranslations("common");
  const certificates = await listUserCertificates(session.user.id);

  // tr-TR for az: same month names on server and client.
  const date = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "tr-TR", { dateStyle: "long" });
  const PASS: Record<string, string> = {
    ACHIEVEMENT: "from-amber-400 via-orange-500 to-rose-500",
    COMPLETION: "from-emerald-400 via-teal-500 to-sky-600",
    PARTICIPATION: "from-indigo-500 via-violet-600 to-fuchsia-600",
  };

  const typeLabel = (type: string) => {
    const key = `certificateTypes.${type.toLowerCase()}`;
    return t.has(key) ? t(key) : type;
  };

  return (
    <DashboardLayout
      panel="participant"
      title={t("myCertificates")}
      userName={session.user.name ?? "Participant"}
    >
      <div className="space-y-6">
        <LargeTitle title={t("myCertificates")} subtitle={t("certificatesSubtitle")} />
        {certificates.length === 0 ? (
          <div className="flex flex-col items-center rounded-[22px] bg-card px-6 py-12 text-center ring-1 ring-border/60">
            <span className="flex h-14 w-14 items-center justify-center rounded-[16px] bg-muted text-muted-foreground">
              <Award className="h-7 w-7" aria-hidden="true" />
            </span>
            <p className="mt-4 max-w-sm text-[14px] leading-relaxed text-muted-foreground">{t("noCertificates")}</p>
          </div>
        ) : (
          <ul className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2">
            {certificates.map((cert, i) => (
              <li
                key={cert.id}
                data-testid="certificate-item"
                style={{ "--i": i + 1 } as React.CSSProperties}
                className={`ios-reveal relative flex min-h-[200px] flex-col overflow-hidden rounded-[24px] bg-gradient-to-br p-5 text-white shadow-[0_18px_40px_-20px_rgba(79,70,229,0.6)] ${
                  cert.revokedAt ? "from-slate-500 to-slate-700 opacity-80" : PASS[cert.type] ?? PASS.PARTICIPATION
                }`}
              >
                <span aria-hidden="true" className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-white/15 blur-2xl" />
                <div className="relative flex items-start justify-between gap-3">
                  <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.5px] backdrop-blur">
                    {typeLabel(cert.type)}
                  </span>
                  <Award className="h-6 w-6 text-white/80" aria-hidden="true" />
                </div>
                <p className="relative mt-4 text-[20px] font-bold leading-snug tracking-[-0.4px]">{cert.title}</p>
                <p className="relative mt-1 text-[13px] text-white/80">{date.format(new Date(cert.issuedAt))}</p>
                <div className="relative mt-auto flex items-end justify-between gap-3 pt-5">
                  <p className="font-mono text-[11px] tracking-[0.5px] text-white/75">{cert.serialNumber}</p>
                  {cert.revokedAt ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-black/25 px-3 py-1.5 text-[12px] font-semibold">
                      <ShieldOff className="h-3.5 w-3.5" aria-hidden="true" />
                      {t("certificateRevoked")}
                    </span>
                  ) : cert.hasPdf ? (
                    <a
                      href={`/api/certificates/${cert.id}/file`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-[13px] font-semibold text-slate-900 transition-transform hover:bg-white/90 active:scale-[0.97]"
                    >
                      <Download className="h-3.5 w-3.5" aria-hidden="true" />
                      {t("downloadCertificate")}
                    </a>
                  ) : (
                    <span className="rounded-full bg-white/20 px-3 py-1.5 text-[12px] font-semibold">{tc("earned")}</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </DashboardLayout>
  );
}
