/**
 * Object key layout — the single place that decides where anything lives.
 *
 * Keys are grouped by prefix so an IAM policy can grant access to one class of
 * document without granting the whole bucket, and so a lifecycle rule can
 * expire throwaway exports without touching issued certificates.
 */

/** Prefix for issued certificate documents. Retained indefinitely. */
export const CERTIFICATES_PREFIX = "certificates";

/** Prefix for generated export archives. Disposable; safe to expire. */
export const EXPORTS_PREFIX = "exports";

/**
 * Keyed by user as well as tenant so that "everything belonging to this
 * person" is one prefix — which is what a GDPR erasure request needs.
 */
export function certificateKey(
  tenantId: string,
  userId: string,
  certificateId: string,
): string {
  return `${CERTIFICATES_PREFIX}/${tenantId}/${userId}/${certificateId}.pdf`;
}

/**
 * Reserved for generated archives. Nothing writes these yet — the bulk ZIP
 * endpoint renders on demand and streams straight to the browser, and report
 * exports keep their CSV in the job record. The builder exists so that when a
 * persisted archive is added it lands in the layout the IAM policy and
 * lifecycle rules already describe, rather than inventing a prefix later.
 */
export function exportKey(tenantId: string, jobId: string): string {
  return `${EXPORTS_PREFIX}/${tenantId}/${jobId}.zip`;
}
