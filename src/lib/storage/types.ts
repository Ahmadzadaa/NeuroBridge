/**
 * Object storage behind one interface.
 *
 * Callers name an object by key and never learn which driver is behind it:
 * local disk in development, S3 in production. That is what makes the
 * production move a configuration change rather than a code change.
 */
export interface SignedUrlOptions {
  /**
   * Name the browser should save the file under.
   *
   * Without it a direct download is named after the key's last segment — an
   * opaque id — where serving the bytes ourselves would have used a readable
   * filename. Expressed as intent, not as an S3 header, so a driver that has
   * no such concept can ignore it.
   */
  downloadFileName?: string;
}

export interface StorageAdapter {
  /** Writes (or overwrites) the object at `key`. */
  put(key: string, body: Uint8Array, contentType: string): Promise<void>;

  /** Reads the whole object. Throws if it does not exist. */
  get(key: string): Promise<Buffer>;

  /**
   * A time-limited direct download URL, or `null` when this driver cannot
   * produce one.
   *
   * The nullable return is deliberate: it lets a route say "redirect if there
   * is a direct URL, otherwise stream the bytes yourself" without knowing that
   * S3 exists at all. Local disk has nothing to presign, so it returns null.
   */
  getSignedUrl(
    key: string,
    ttlSeconds: number,
    options?: SignedUrlOptions,
  ): Promise<string | null>;

  /** Removes the object. Succeeds even if it was already gone. */
  delete(key: string): Promise<void>;

  exists(key: string): Promise<boolean>;
}

export type StorageDriver = "local" | "s3";
