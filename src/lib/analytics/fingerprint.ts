import { createHash } from "crypto";

/**
 * Stable cache discriminator for one analytics request.
 *
 * Every input that changes the numbers has to appear here, or two different
 * views would share a cache entry — an admin filtering to one course would be
 * served the whole-tenant figures. Locale is included because course titles
 * are localised in the payload.
 *
 * A request with no dates produces a stable fingerprint on purpose: the
 * default "last 90 days" view is the common case and should share one entry
 * for the hour, even though its window slides.
 */
export function analyticsFingerprint(input: {
  from?: Date;
  to?: Date;
  courseId?: string | null;
  programId?: string | null;
  locale?: string;
}): string {
  const parts = [
    input.from?.toISOString() ?? "default",
    input.to?.toISOString() ?? "default",
    input.courseId ?? "all",
    input.programId ?? "all",
    input.locale ?? "az",
  ].join("|");

  // Hashed rather than concatenated: ISO timestamps contain ':' and would make
  // the Redis key awkward to read and to match by prefix.
  return createHash("sha1").update(parts).digest("hex").slice(0, 16);
}
