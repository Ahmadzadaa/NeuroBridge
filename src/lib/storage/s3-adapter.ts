import type { StorageAdapter } from "@/lib/storage/types";

/**
 * S3-backed storage for deployed environments.
 *
 * The bucket is private: nothing is ever served from it directly. A caller
 * that wants to hand a browser a download asks for a signed URL, and the route
 * that does so has already checked authorisation.
 *
 * The SDK is imported lazily, the same way `email-service.ts` loads the SES
 * client — a local `npm run dev` never pays to load it.
 */

type S3Module = typeof import("@aws-sdk/client-s3");

interface S3Runtime {
  sdk: S3Module;
  client: InstanceType<S3Module["S3Client"]>;
}

let runtime: S3Runtime | null = null;

async function getRuntime(): Promise<S3Runtime> {
  if (!runtime) {
    const sdk = await import("@aws-sdk/client-s3");
    runtime = {
      sdk,
      client: new sdk.S3Client({
        region: process.env.AWS_REGION ?? "eu-central-1",
      }),
    };
  }
  return runtime;
}

/** Test seam: drops the cached client so env changes take effect. */
export function resetS3RuntimeForTests(): void {
  runtime = null;
}

function bucket(): string {
  const name = process.env.S3_DOCUMENTS_BUCKET;
  if (!name) {
    throw new Error(
      "S3_DOCUMENTS_BUCKET is not set, but STORAGE_DRIVER is 's3'",
    );
  }
  return name;
}

/** S3 signals "no such object" through several shapes depending on the call. */
function isNotFound(error: unknown): boolean {
  const err = error as
    | { name?: string; $metadata?: { httpStatusCode?: number } }
    | undefined;
  return (
    err?.name === "NotFound" ||
    err?.name === "NoSuchKey" ||
    err?.$metadata?.httpStatusCode === 404
  );
}

/**
 * The name goes into a signed header, so a quote or newline would let a caller
 * inject extra header content. Only characters that are safe in a filename
 * survive.
 */
function sanitizeFileName(name: string): string {
  return name.replace(/[^\p{L}\p{N} ._-]/gu, "").slice(0, 120) || "document.pdf";
}

export function createS3Storage(): StorageAdapter {
  return {
    async put(key, body, contentType) {
      const { sdk, client } = await getRuntime();
      await client.send(
        new sdk.PutObjectCommand({
          Bucket: bucket(),
          Key: key,
          Body: body,
          ContentType: contentType,
          ServerSideEncryption: "AES256",
        }),
      );
    },

    async get(key) {
      const { sdk, client } = await getRuntime();
      const response = await client.send(
        new sdk.GetObjectCommand({ Bucket: bucket(), Key: key }),
      );
      if (!response.Body) {
        throw new Error(`Empty response body for ${key}`);
      }
      return Buffer.from(await response.Body.transformToByteArray());
    },

    async getSignedUrl(key, ttlSeconds, options) {
      const { sdk, client } = await getRuntime();
      const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
      return getSignedUrl(
        client,
        new sdk.GetObjectCommand({
          Bucket: bucket(),
          Key: key,
          ...(options?.downloadFileName
            ? {
                ResponseContentDisposition: `inline; filename="${sanitizeFileName(options.downloadFileName)}"`,
              }
            : {}),
        }),
        { expiresIn: ttlSeconds },
      );
    },

    async delete(key) {
      const { sdk, client } = await getRuntime();
      await client.send(
        new sdk.DeleteObjectCommand({ Bucket: bucket(), Key: key }),
      );
    },

    async exists(key) {
      const { sdk, client } = await getRuntime();
      try {
        await client.send(
          new sdk.HeadObjectCommand({ Bucket: bucket(), Key: key }),
        );
        return true;
      } catch (error) {
        if (isNotFound(error)) return false;
        throw error;
      }
    },
  };
}
