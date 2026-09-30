import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit/audit-service";
import { AUDIT_ACTIONS } from "@/lib/audit/actions";
import { getTenantSettings } from "@/lib/tenant/settings-service";
import { getTemplate, fillBody } from "@/lib/certificates/templates";
import { renderCertificatePdf } from "@/lib/certificates/pdf-renderer";
import { storeCertificatePdf } from "@/lib/certificates/storage";
import {
  generateVerifyCode,
  nextSerialNumber,
} from "@/lib/certificates/serial";
import { CertificateDisabledError } from "@/lib/certificates/errors";

export const CERTIFICATE_TYPES = [
  "PARTICIPATION",
  "ACHIEVEMENT",
  "COMPLETION",
] as const;
export type CertificateType = (typeof CERTIFICATE_TYPES)[number];

const SETTINGS_KEY: Record<
  CertificateType,
  | "participationCertificate"
  | "achievementCertificate"
  | "completionCertificate"
> = {
  PARTICIPATION: "participationCertificate",
  ACHIEVEMENT: "achievementCertificate",
  COMPLETION: "completionCertificate",
};

export interface IssueRecipient {
  userId: string;
  /** Name as it should appear on the document, snapshotted at issue time. */
  name: string;
}

export interface IssueInput {
  tenantId: string;
  issuedByUserId: string;
  templateId: string;
  programId?: string | null;
  /** Programme or training title printed on the certificate. */
  title: string;
  /** Body copy; `{name}` is replaced per recipient. */
  body: string;
  locale?: string;
  issuerName?: string;
  signature1Name?: string;
  signature1Role?: string;
  signature2Name?: string;
  signature2Role?: string;
  recipients: IssueRecipient[];
}

export type IssueOutcome =
  | {
      userId: string;
      status: "issued";
      certificateId: string;
      serialNumber: string;
    }
  | {
      userId: string;
      status: "already";
      certificateId: string;
      serialNumber: string;
    }
  | { userId: string; status: "failed"; reason: string };

/**
 * Issues one certificate per recipient and delivers it to their account.
 *
 * Two deliberate choices:
 *
 * 1. Rows are created first, inside a transaction that reserves each serial;
 *    the PDFs are rendered afterwards. Rendering a page takes a few hundred
 *    milliseconds, and holding a write transaction open across thirty of them
 *    would block every other seat or registration write on the tenant.
 *
 * 2. A recipient who already holds this certificate for this programme is
 *    reported as `already` rather than failing the whole batch. Re-running a
 *    bulk issue after adding two late participants is a normal thing for an
 *    administrator to do, and it must not error or produce duplicates.
 */
export async function issueCertificates(
  input: IssueInput,
): Promise<IssueOutcome[]> {
  const template = getTemplate(input.templateId);
  if (!template)
    throw new Error(`Unknown certificate template: ${input.templateId}`);

  const settings = await getTenantSettings(input.tenantId);
  if (settings && settings[SETTINGS_KEY[template.type]] === false) {
    throw new CertificateDisabledError(template.type);
  }

  const tenant = await prisma.tenant.findUniqueOrThrow({
    where: { id: input.tenantId },
    select: { name: true },
  });

  const locale = input.locale ?? "az";
  const outcomes: IssueOutcome[] = [];

  for (const recipient of input.recipients) {
    try {
      const existing = await prisma.certificate.findFirst({
        where: {
          userId: recipient.userId,
          type: template.type,
          programId: input.programId ?? null,
        },
        select: { id: true, serialNumber: true, pdfPath: true },
      });

      // Only a row that actually has a stored document counts as delivered.
      // Seeded and pre-2026 rows carry no `pdfPath`; reporting those as
      // `already` would leave the holder with a certificate they cannot open,
      // so the document is rendered and attached to the existing row instead.
      if (existing?.pdfPath) {
        outcomes.push({
          userId: recipient.userId,
          status: "already",
          certificateId: existing.id,
          serialNumber: existing.serialNumber,
        });
        continue;
      }

      const created: { id: string; serialNumber: string } =
        existing ??
        (await prisma.$transaction(async (tx) => {
          const serialNumber = await nextSerialNumber(tx, {
            tenantId: input.tenantId,
            tenantName: tenant.name,
          });
          return tx.certificate.create({
            data: {
              tenantId: input.tenantId,
              userId: recipient.userId,
              programId: input.programId ?? null,
              type: template.type,
              templateId: template.id,
              serialNumber,
              verifyCode: generateVerifyCode(),
              recipientName: recipient.name,
              title: input.title,
              locale,
              issuedByUserId: input.issuedByUserId,
            },
            select: { id: true, serialNumber: true },
          });
        }));

      const bytes = await renderCertificatePdf(template, {
        recipientName: recipient.name,
        body: fillBody(input.body, {
          name: recipient.name,
          program: input.title,
        }),
        issuerName: input.issuerName,
        signature1Name: input.signature1Name,
        signature1Role: input.signature1Role,
        signature2Name: input.signature2Name,
        signature2Role: input.signature2Role,
      });

      const stored = await storeCertificatePdf({
        tenantId: input.tenantId,
        userId: recipient.userId,
        certificateId: created.id,
        bytes,
      });

      await prisma.certificate.update({
        where: { id: created.id },
        data: {
          pdfPath: stored.key,
          pdfHash: stored.hash,
          // Backfilled rows never held a document, so the snapshot fields are
          // set now, at the moment the certificate really becomes one.
          ...(existing
            ? {
                templateId: template.id,
                recipientName: recipient.name,
                title: input.title,
                locale,
              }
            : {}),
        },
      });

      await recordAudit({
        action: AUDIT_ACTIONS.CERTIFICATE_ISSUED,
        userId: input.issuedByUserId,
        tenantId: input.tenantId,
        details: {
          certificateId: created.id,
          serialNumber: created.serialNumber,
          recipientUserId: recipient.userId,
          type: template.type,
        },
      });

      outcomes.push({
        userId: recipient.userId,
        status: "issued",
        certificateId: created.id,
        serialNumber: created.serialNumber,
      });
    } catch (error) {
      // One bad recipient must not lose the other twenty-nine.
      outcomes.push({
        userId: recipient.userId,
        status: "failed",
        reason: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return outcomes;
}
