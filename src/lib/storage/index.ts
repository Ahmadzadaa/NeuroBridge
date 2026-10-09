import { createLocalStorage } from "@/lib/storage/local-adapter";
import { createS3Storage } from "@/lib/storage/s3-adapter";
import type { StorageAdapter, StorageDriver } from "@/lib/storage/types";

export type { StorageAdapter, StorageDriver } from "@/lib/storage/types";
export {
  CERTIFICATES_PREFIX,
  EXPORTS_PREFIX,
  certificateKey,
  exportKey,
} from "@/lib/storage/keys";

/** Default signed-URL lifetime, in seconds. */
export const DEFAULT_SIGNED_URL_TTL = 300;

/**
 * Which driver is active.
 *
 * Mirrors `activeProvider()` in `email-service.ts`: an explicit setting wins,
 * otherwise production gets the real backend and everything else gets the
 * local one. Defaulting production to S3 matters — a deployment that silently
 * fell back to local disk is the exact failure this module exists to prevent.
 */
export function activeDriver(
  env: NodeJS.ProcessEnv = process.env,
): StorageDriver {
  if (env.STORAGE_DRIVER === "s3") return "s3";
  if (env.STORAGE_DRIVER === "local") return "local";
  return env.NODE_ENV === "production" ? "s3" : "local";
}

/**
 * How long a signed download link stays valid. Kept short on purpose: the
 * route checks revocation before minting one, and a signed URL cannot be
 * withdrawn once issued, so this is the window in which a certificate revoked
 * a moment ago is still downloadable by someone holding the link.
 */
export function signedUrlTtl(env: NodeJS.ProcessEnv = process.env): number {
  const raw = Number(env.STORAGE_SIGNED_URL_TTL);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : DEFAULT_SIGNED_URL_TTL;
}

let cached: { driver: StorageDriver; adapter: StorageAdapter } | null = null;

/** The configured storage backend. Built once, then reused. */
export function getStorage(): StorageAdapter {
  const driver = activeDriver();
  if (!cached || cached.driver !== driver) {
    cached = {
      driver,
      adapter: driver === "s3" ? createS3Storage() : createLocalStorage(),
    };
  }
  return cached.adapter;
}

/** Test seam: forces the next `getStorage()` to rebuild from the environment. */
export function resetStorageForTests(): void {
  cached = null;
}
