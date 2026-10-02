import { randomUUID } from "crypto";
import { createReadStream, createWriteStream } from "fs";
import { mkdir, rename, rm, stat } from "fs/promises";
import path from "path";
import { Readable, Transform } from "stream";
import { pipeline } from "stream/promises";
import type { ReadableStream as WebReadableStream } from "stream/web";
import { activeDriver, getStorage } from "@/lib/storage";
import { localPath } from "@/lib/storage/local-adapter";

/**
 * Lesson videos kept in our own storage. They are far larger than anything
 * else stored, so they never pass through memory whole: uploads stream to disk
 * (or to S3), and playback streams byte ranges so the player can seek.
 */
export const VIDEO_TYPES: Record<string, string> = { "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov" };
export const LESSON_VIDEOS_PREFIX = "lesson-videos";
/** A signed link outlives a long lesson: the player keeps requesting ranges from it while it plays. */
const SIGNED_URL_TTL_SEC = 6 * 60 * 60;

export function maxVideoBytes(env: NodeJS.ProcessEnv = process.env): number {
  const mb = Number(env.LESSON_VIDEO_MAX_MB);
  return (Number.isFinite(mb) && mb > 0 ? mb : 2048) * 1024 * 1024;
}

export class VideoFileError extends Error {
  constructor(
    public readonly code: "UNSUPPORTED_TYPE" | "TOO_LARGE" | "LENGTH_REQUIRED" | "INCOMPLETE",
    public readonly statusCode: number
  ) {
    super(code);
    this.name = "VideoFileError";
  }
}

export function videoKeyFor(lessonId: string, contentType: string): string {
  const ext = VIDEO_TYPES[contentType];
  if (!ext) throw new VideoFileError("UNSUPPORTED_TYPE", 415);
  return `${LESSON_VIDEOS_PREFIX}/${lessonId}/${randomUUID()}.${ext}`;
}

/** Fails the stream once it carries more than the declared length. */
function byteGuard(limit: number) {
  let seen = 0;
  const guard = new Transform({
    transform(chunk: Buffer, _enc, done) {
      seen += chunk.length;
      done(seen > limit ? new VideoFileError("TOO_LARGE", 413) : null, chunk);
    },
  });
  return { guard, seen: () => seen };
}

/** Streams an upload into storage. The declared length is checked against what actually arrives. */
export async function storeVideo(key: string, body: WebReadableStream<Uint8Array>, contentType: string, length: number) {
  if (!Number.isFinite(length) || length <= 0) throw new VideoFileError("LENGTH_REQUIRED", 411);
  if (length > maxVideoBytes()) throw new VideoFileError("TOO_LARGE", 413);
  const { guard, seen } = byteGuard(length);
  const source = Readable.fromWeb(body);

  if (activeDriver() === "s3") {
    const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
    const client = new S3Client({ region: process.env.AWS_REGION ?? "eu-central-1" });
    await Promise.all([
      pipeline(source, guard),
      client.send(
        new PutObjectCommand({
          Bucket: process.env.S3_DOCUMENTS_BUCKET,
          Key: key,
          Body: guard,
          ContentLength: length,
          ContentType: contentType,
          ServerSideEncryption: "AES256",
        })
      ),
    ]);
    return;
  }

  // Written under a temporary name first, so a broken upload never looks like a video.
  const target = localPath(key);
  const partial = `${target}.part`;
  await mkdir(path.dirname(target), { recursive: true });
  try {
    await pipeline(source, guard, createWriteStream(partial));
    if (seen() !== length) throw new VideoFileError("INCOMPLETE", 400);
    await rename(partial, target);
  } catch (error) {
    await rm(partial, { force: true });
    throw error;
  }
}

export async function deleteVideo(key: string) {
  await getStorage().delete(key);
}

/** "bytes=start-end" → an inclusive range within the file, or null when absent or unusable. */
export function parseRange(header: string | null, size: number): { start: number; end: number } | null {
  const match = header?.match(/^bytes=(\d*)-(\d*)$/);
  if (!match || (match[1] === "" && match[2] === "")) return null;
  let start: number;
  let end: number;
  if (match[1] === "") {
    // "bytes=-500": the last 500 bytes.
    start = Math.max(0, size - Number(match[2]));
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] === "" ? size - 1 : Math.min(Number(match[2]), size - 1);
  }
  return start <= end && start < size ? { start, end } : null;
}

const contentTypeOf = (key: string) => Object.entries(VIDEO_TYPES).find(([, ext]) => key.endsWith(`.${ext}`))?.[0] ?? "application/octet-stream";

/**
 * The response that plays a stored video: a redirect to a short-lived S3 link,
 * or the bytes from disk with range support so the player can seek.
 */
export async function serveVideo(key: string, rangeHeader: string | null): Promise<Response> {
  const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
  const signed = await getStorage().getSignedUrl(key, SIGNED_URL_TTL_SEC);
  if (signed) return new Response(null, { status: 302, headers: { ...headers, Location: signed } });

  const file = localPath(key);
  const size = (await stat(file)).size;
  const type = contentTypeOf(key);
  const range = parseRange(rangeHeader, size);
  if (rangeHeader && !range) {
    return new Response(null, { status: 416, headers: { ...headers, "Content-Range": `bytes */${size}` } });
  }
  const { start, end } = range ?? { start: 0, end: size - 1 };
  const stream = Readable.toWeb(createReadStream(file, { start, end })) as ReadableStream<Uint8Array>;
  return new Response(stream, {
    status: range ? 206 : 200,
    headers: {
      ...headers,
      "Content-Type": type,
      "Content-Length": String(end - start + 1),
      "Accept-Ranges": "bytes",
      ...(range ? { "Content-Range": `bytes ${start}-${end}/${size}` } : {}),
    },
  });
}
