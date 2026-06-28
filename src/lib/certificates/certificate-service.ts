import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit/audit-service";
import { AUDIT_ACTIONS } from "@/lib/audit/actions";
import { getTenantSettings } from "@/lib/tenant/settings-service";
import {
  CertificateAlreadyIssuedError,
  CertificateDisabledError,
  CertificateParticipantNotFoundError,
} from "@/lib/certificates/errors";

export const CERTIFICATE_TYPES = [
  "PARTICIPATION",
  "ACHIEVEMENT",
  "COMPLETION",
] as const;

export type CertificateType = (typeof CERTIFICATE_TYPES)[number];

const SETTINGS_KEY: Record<
  CertificateType,
  "participationCertificate" | "achievementCertificate" | "completionCertificate"
> = {
  PARTICIPATION: "participationCertificate",
  ACHIEVEMENT: "achievementCertificate",
  COMPLETION: "completionCertificate",
};

export interface CertificateRecord {
  id: string;
  type: string;
  issuedAt: Date;
  pdfUrl: string | null;
}

export async function listUserCertificates(
  userId: string
): Promise<CertificateRecord[]> {
  return prisma.certificate.findMany({
    where: { userId },
    select: { id: true, type: true, issuedAt: true, pdfUrl: true },
    orderBy: { issuedAt: "desc" },
  });
}

export async function issueCertificate(input: {
  userId: string;
  tenantId: string;
  type: CertificateType;
  issuedByUserId?: string;
}): Promise<CertificateRecord> {
  const participant = await prisma.participant.findFirst({
    where: {
      userId: input.userId,
      program: { tenantId: input.tenantId },
    },
    select: { id: true },
  });

  if (!participant) {
    throw new CertificateParticipantNotFoundError();
  }

  const settings = await getTenantSettings(input.tenantId);
  const settingsKey = SETTINGS_KEY[input.type];
  if (settings && settings[settingsKey] === false) {
    throw new CertificateDisabledError(input.type);
  }

  const existing = await prisma.certificate.findFirst({
    where: { userId: input.userId, type: input.type },
    select: { id: true },
  });

  if (existing) {
    throw new CertificateAlreadyIssuedError();
  }

  const certificate = await prisma.certificate.create({
    data: {
      userId: input.userId,
      type: input.type,
      pdfUrl: null,
    },
    select: { id: true, type: true, issuedAt: true, pdfUrl: true },
  });

  await recordAudit({
    action: AUDIT_ACTIONS.CERTIFICATE_ISSUED,
    userId: input.issuedByUserId,
    tenantId: input.tenantId,
    details: {
      certificateId: certificate.id,
      recipientUserId: input.userId,
      type: input.type,
    },
  });

  return certificate;
}
