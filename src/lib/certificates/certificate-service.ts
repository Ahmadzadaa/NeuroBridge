import { prisma } from "@/lib/prisma";
import { CERTIFICATE_TEMPLATES, fillBody } from "@/lib/certificates/templates";

export { CERTIFICATE_TYPES, type CertificateType } from "@/lib/certificates/issue-service";

export interface CertificateRecord {
  id: string;
  type: string;
  title: string;
  serialNumber: string;
  issuedAt: Date;
  revokedAt: Date | null;
  /** Present once the PDF has been rendered and stored. */
  hasPdf: boolean;
}

/**
 * Certificates held by one user, newest first.
 *
 * `pdfPath` is deliberately not returned: it is a server-side storage location,
 * and the file is served through the permissioned route so the path never has
 * to reach the browser.
 */
export async function listUserCertificates(
  userId: string
): Promise<Array<CertificateRecord & { recipientName: string; issuer: string; templateId: string | null; body: string }>> {
  const rows = await prisma.certificate.findMany({
    where: { userId },
    select: {
      id: true,
      type: true,
      title: true,
      serialNumber: true,
      issuedAt: true,
      revokedAt: true,
      pdfPath: true,
      recipientName: true,
      templateId: true,
      locale: true,
      body: true,
      issuerName: true,
      tenant: { select: { name: true } },
    },
    orderBy: { issuedAt: "desc" },
  });

  return rows.map(({ pdfPath, tenant, locale, body, issuerName, ...rest }) => {
    // Older rows did not keep their wording; the PDF used the template's default, so that is what to show.
    const template = CERTIFICATE_TEMPLATES[rest.templateId ?? ""] ?? Object.values(CERTIFICATE_TEMPLATES).find((t) => t.type === rest.type);
    const fallback = template ? fillBody(template.defaultBody[locale] ?? template.defaultBody.az ?? "", { name: rest.recipientName, program: rest.title }) : "";
    return { ...rest, issuer: issuerName ?? tenant.name, body: body ?? fallback, hasPdf: Boolean(pdfPath) };
  });
}

/** Certificates issued by a tenant, for the admin overview. */
export async function listTenantCertificates(
  tenantId: string,
  limit = 200
): Promise<
  Array<CertificateRecord & { recipientName: string; verifyCode: string }>
> {
  const rows = await prisma.certificate.findMany({
    where: { tenantId },
    select: {
      id: true,
      type: true,
      title: true,
      serialNumber: true,
      verifyCode: true,
      recipientName: true,
      issuedAt: true,
      revokedAt: true,
      pdfPath: true,
    },
    orderBy: { issuedAt: "desc" },
    take: limit,
  });

  return rows.map(({ pdfPath, ...rest }) => ({ ...rest, hasPdf: Boolean(pdfPath) }));
}
