import { setRequestLocale } from "next-intl/server";
import { requireRole } from "@/lib/auth-utils";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { getTranslations } from "next-intl/server";
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
  const certificates = await listUserCertificates(session.user.id);

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
                  className="flex items-center justify-between rounded-xl border p-4"
                  data-testid="certificate-item"
                >
                  <div>
                    <p className="font-medium">{cert.type}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(cert.issuedAt).toLocaleDateString(locale)}
                    </p>
                  </div>
                  <Badge variant="secondary">{t("earned")}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
