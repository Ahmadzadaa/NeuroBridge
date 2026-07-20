import { setRequestLocale } from "next-intl/server";
import { requireRole } from "@/lib/auth-utils";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { getTranslations } from "next-intl/server";
import { Award } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listUserCertificates } from "@/lib/certificates/certificate-service";

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
      <Card className="rounded-2xl border-0 shadow-sm">
        <CardContent className="p-6">
          {certificates.length === 0 ? (
            <p className="text-center text-muted-foreground">
              {t("noCertificates")}
            </p>
          ) : (
            <ul className="space-y-3">
              {certificates.map((cert) => (
                <li
                  key={cert.id}
                  className="flex items-center justify-between gap-4 rounded-xl border border-border p-4"
                  data-testid="certificate-item"
                >
                  <div className="flex min-w-0 items-center gap-3.5">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Award className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {typeLabel(cert.type)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(cert.issuedAt).toLocaleDateString(locale)}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary">{tc("earned")}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
