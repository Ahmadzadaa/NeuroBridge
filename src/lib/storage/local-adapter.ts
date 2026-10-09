import { mkdir, readFile, rm, stat, writeFile } from "fs/promises";
import path from "path";
import type { StorageAdapter } from "@/lib/storage/types";

/**
 * Disk-backed storage for development.
 *
 * Keeps the behaviour the certificate module had before object storage
 * existed: files under `uploads/`, directories created on demand. It is not
 * suitable for ECS, where the container filesystem is ephemeral — that is
 * precisely why the S3 driver exists.
 */
export const LOCAL_ROOT = path.join(process.cwd(), "uploads");

/**
 * Keys are server-generated, but a tampered database row could still carry
 * `../../etc/passwd`. Resolving and re-checking the prefix means a bad key
 * fails loudly instead of reading an arbitrary file.
 */
function resolveWithinRoot(root: string, key: string): string {
  const absolute = path.resolve(root, key);
  if (absolute !== root && !absolute.startsWith(path.resolve(root) + path.sep)) {
    throw new Error(`Storage key escapes the storage root: ${key}`);
  }
  return absolute;
}

export function createLocalStorage(root: string = LOCAL_ROOT): StorageAdapter {
  return {
    async put(key, body) {
      const absolute = resolveWithinRoot(root, key);
      await mkdir(path.dirname(absolute), { recursive: true });
      await writeFile(absolute, body);
    },

    async get(key) {
      return readFile(resolveWithinRoot(root, key));
    },

    /**
     * Local disk has no signing mechanism, and inventing a token here would be
     * a second, weaker auth path next to the route that already guards these
     * documents. Returning null tells the caller to serve the bytes itself.
     */
    async getSignedUrl() {
      return null;
    },

    async delete(key) {
      // force: a delete of something already gone is a success, not an error —
      // that is what makes cleanup and re-runs idempotent.
      await rm(resolveWithinRoot(root, key), { force: true });
    },

    async exists(key) {
      try {
        const info = await stat(resolveWithinRoot(root, key));
        return info.isFile();
      } catch {
        return false;
      }
    },
  };
}

/** Absolute path of a key on local disk, for callers that stream instead of buffering. */
export function localPath(key: string, root: string = LOCAL_ROOT): string {
  return resolveWithinRoot(root, key);
}
