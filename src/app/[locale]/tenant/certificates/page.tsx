import { setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { CERTIFICATE_TEMPLATES } from "@/lib/certificates/templates";
import { CertificatesPageClient } from "./certificates-client";

export default async function TenantCertificatesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireRole(locale, ["TENANT_ADMIN"]);

  if (!session.user.tenantId) {
    redirect(`/${locale}/tenant`);
  }

  const [tenant, programs, participants] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: session.user.tenantId },
      select: { name: true },
    }),
    prisma.program.findMany({
      where: { tenantId: session.user.tenantId },
      select: { id: true, name: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.user.findMany({
      where: { tenantId: session.user.tenantId, role: "PARTICIPANT" },
      select: { id: true, firstName: true, lastName: true, email: true },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      take: 500,
    }),
  ]);

  return (
    <CertificatesPageClient
      locale={locale}
      userName={session.user.name ?? "Admin"}
      tenantName={tenant?.name ?? ""}
      programs={programs}
      participants={participants.map((p) => ({
        id: p.id,
        name: [p.firstName, p.lastName].filter(Boolean).join(" ") || p.email,
        email: p.email,
      }))}
      templates={Object.values(CERTIFICATE_TEMPLATES).map((t) => ({
        id: t.id,
        name: t.name,
      style: t.style,
        type: t.type,
        defaultBody: t.defaultBody,
        fields: t.blocks.map((b) => b.key),
      }))}
    />
  );
}
