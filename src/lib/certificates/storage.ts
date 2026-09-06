import { createHash } from "crypto";
import {
  CERTIFICATES_PREFIX,
  certificateKey,
  getStorage,
  signedUrlTtl,
} from "@/lib/storage";

/**
 * Where issued certificate PDFs live.
 *
 * This module owns the certificate-specific concerns — the key layout and the
 * content hash — and delegates the actual bytes to the configured storage
 * driver. Nothing here, and nothing that calls it, knows whether that driver
 * is local disk or S3.
 */

export interface StoredPdf {
  /** Storage key, safe to persist in `Certificate.pdfPath`. */
  key: string;
  /** sha256 of the bytes, so a later download can be proven unaltered. */
  hash: string;
}

/**
 * Accepts both key generations.
 *
 * Rows written before object storage hold a path relative to the certificates
 * directory (`{tenantId}/{certId}.pdf`) — and, if they were written on
 * Windows, with backslashes. Those rows must keep opening until
 * `scripts/migrate-certificates-to-s3.ts` has rewritten them, so a value
 * without the current prefix is interpreted as the legacy form rather than
 * rejected.
 */
export function resolveCertificateKey(stored: string): string {
  const normalized = stored.replaceAll("\\", "/");
  return normalized.startsWith(`${CERTIFICATES_PREFIX}/`)
    ? normalized
    : `${CERTIFICATES_PREFIX}/${normalized}`;
}

export async function storeCertificatePdf(params: {
  tenantId: string;
  userId: string;
  certificateId: string;
  bytes: Uint8Array;
}): Promise<StoredPdf> {
  const key = certificateKey(
    params.tenantId,
    params.userId,
    params.certificateId,
  );

  await getStorage().put(key, params.bytes, "application/pdf");

  return {
    key,
    hash: createHash("sha256").update(params.bytes).digest("hex"),
  };
}

export async function readCertificatePdf(stored: string): Promise<Buffer> {
  return getStorage().get(resolveCertificateKey(stored));
}

/**
 * A short-lived direct download link, or `null` when the active driver cannot
 * produce one — in which case the caller is expected to serve the bytes.
 */
export async function getCertificatePdfUrl(
  stored: string,
  options: { fileName?: string; ttlSeconds?: number } = {},
): Promise<string | null> {
  return getStorage().getSignedUrl(
    resolveCertificateKey(stored),
    options.ttlSeconds ?? signedUrlTtl(),
    { downloadFileName: options.fileName },
  );
}
