import type { CSSProperties } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Award, Download, Eye, ShieldOff } from "lucide-react";
import { requireRole } from "@/lib/auth-utils";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { LargeTitle } from "@/components/ui/ios";
import { CertificateThumbnail } from "@/components/certificates/certificate-thumbnail";
import { listUserCertificates } from "@/lib/certificates/certificate-service";
import { formatDate } from "@/lib/format-date";
import { cn } from "@/lib/utils";

/** Soft type marks, matching the colours of each template. */
const TYPE_TONE: Record<string, string> = {
  ACHIEVEMENT: "bg-amber-500/12 text-amber-700 dark:text-amber-400",
  PARTICIPATION: "bg-indigo-500/12 text-indigo-700 dark:text-indigo-300",
  COMPLETION: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
};

export default async function CertificatesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireRole(locale, ["PARTICIPANT"]);
  const t = await getTranslations("participant");
  const certificates = await listUserCertificates(session.user.id);
  const active = certificates.filter((c) => !c.revokedAt).length;

  const typeLabel = (type: string) => {
    const key = `certificateTypes.${type.toLowerCase()}`;
    return t.has(key) ? t(key) : type;
  };

  return (
    <DashboardLayout panel="participant" title={t("myCertificates")} userName={session.user.name ?? "Participant"}>
      <div className="mx-auto max-w-6xl space-y-6">
        <LargeTitle
          title={t("myCertificates")}
          subtitle={t("certificatesSubtitle")}
          actions={
            certificates.length > 0 ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-card px-3.5 py-1.5 text-[13px] font-semibold ring-1 ring-border/60">
                <Award className="h-4 w-4 text-amber-500" aria-hidden="true" />
                {t("certificateCount", { count: active })}
              </span>
            ) : undefined
          }
        />

        {certificates.length === 0 ? (
          <div className="flex flex-col items-center rounded-[22px] bg-card px-6 py-14 text-center ring-1 ring-border/60">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10 text-amber-500">
              <Award className="h-8 w-8" aria-hidden="true" />
            </span>
            <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-muted-foreground">{t("noCertificates")}</p>
          </div>
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {certificates.map((cert, i) => {
              const fileUrl = `/api/certificates/${cert.id}/file`;
              const revoked = Boolean(cert.revokedAt);
              return (
                <li
                  key={cert.id}
                  data-testid="certificate-item"
                  style={{ "--i": i + 1 } as CSSProperties}
                  className="ios-reveal group flex flex-col rounded-[24px] bg-card p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_30px_-16px_rgba(15,23,42,0.25)] ring-1 ring-border/60"
                >
                  {/* The paper itself: opens the PDF. */}
                  {revoked ? (
                    <CertificateThumbnail
                      type={cert.type}
                      word={t("certificateWord")}
                      typeLabel={typeLabel(cert.type)}
                      recipient={cert.recipientName}
                      title={cert.title}
                      revoked
                    />
                  ) : (
                    <a
                      href={fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={t("viewCertificateNamed", { title: cert.title })}
                      className="block rounded-[14px] shadow-[0_2px_8px_-2px_rgba(15,23,42,0.25)] ring-1 ring-black/5 transition-transform duration-200 group-hover:-translate-y-0.5"
                    >
                      <CertificateThumbnail
                        type={cert.type}
                        word={t("certificateWord")}
                        typeLabel={typeLabel(cert.type)}
                        recipient={cert.recipientName}
                        title={cert.title}
                      />
                    </a>
                  )}

                  <div className="flex flex-1 flex-col px-2 pb-1 pt-4">
                    <span className={cn("self-start rounded-full px-2.5 py-0.5 text-[11px] font-semibold", TYPE_TONE[cert.type] ?? TYPE_TONE.ACHIEVEMENT)}>
                      {typeLabel(cert.type)}
                    </span>
                    <h2 className="mt-2 text-[17px] font-bold leading-snug tracking-[-0.3px]">{cert.title}</h2>
                    <p className="mt-1 text-[13px] text-muted-foreground">
                      {cert.issuer} · {formatDate(new Date(cert.issuedAt), locale, "long")}
                    </p>
                    <p className="mt-2 text-[12px] text-muted-foreground">
                      {t("certificateSerial")} <span className="font-mono tracking-[0.04em] text-foreground/80">{cert.serialNumber}</span>
                    </p>

                    <div className="mt-auto pt-4">
                      {revoked ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-3 py-1.5 text-[13px] font-semibold text-destructive">
                          <ShieldOff className="h-4 w-4" aria-hidden="true" />
                          {t("certificateRevoked")}
                        </span>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          <a
                            href={fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full bg-muted text-[14px] font-semibold text-foreground transition-colors hover:bg-muted/70"
                          >
                            <Eye className="h-4 w-4" aria-hidden="true" />
                            {t("viewCertificate")}
                          </a>
                          <a
                            href={`${fileUrl}?download=1`}
                            download
                            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full bg-primary text-[14px] font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                          >
                            <Download className="h-4 w-4" aria-hidden="true" />
                            {t("downloadCertificate")}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </DashboardLayout>
  );
}
