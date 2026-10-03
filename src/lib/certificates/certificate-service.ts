import { prisma } from "@/lib/prisma";

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
): Promise<Array<CertificateRecord & { recipientName: string; issuer: string }>> {
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
      tenant: { select: { name: true } },
    },
    orderBy: { issuedAt: "desc" },
  });

  return rows.map(({ pdfPath, tenant, ...rest }) => ({ ...rest, issuer: tenant.name, hasPdf: Boolean(pdfPath) }));
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
