import { randomUUID } from "crypto";
import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import sharp from "sharp";

/**
 * Profile picture storage.
 *
 * Files live outside the public directory and are served through an
 * authenticated route, so an avatar cannot be enumerated or hotlinked by
 * guessing a URL. The stored filename is server-generated; the client's
 * filename is never used as a path component.
 */

export const AVATAR_ROOT = path.join(process.cwd(), "uploads", "avatars");
export const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // 2 MB
const AVATAR_SIZE = 512;

export class InvalidAvatarError extends Error {
  readonly statusCode = 400;

  constructor(message: string) {
    super(message);
    this.name = "InvalidAvatarError";
  }
}

interface ImageKind {
  extension: string;
  contentType: string;
}

/**
 * Identifies the image by its magic bytes. The declared MIME type and the
 * file extension are both client-controlled and cannot be trusted.
 */
export function detectImageKind(buffer: Buffer): ImageKind | null {
  if (buffer.length < 12) return null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { extension: "jpg", contentType: "image/jpeg" };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer.subarray(1, 4).toString("latin1") === "PNG" &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { extension: "png", contentType: "image/png" };
  }

  // WebP: "RIFF" .... "WEBP"
  if (
    buffer.subarray(0, 4).toString("latin1") === "RIFF" &&
    buffer.subarray(8, 12).toString("latin1") === "WEBP"
  ) {
    return { extension: "webp", contentType: "image/webp" };
  }

  return null;
}

export function contentTypeForPath(storedPath: string): string {
  const extension = path.extname(storedPath).toLowerCase();
  if (extension === ".png") return "image/png";
  if (extension === ".webp") return "image/webp";
  return "image/jpeg";
}

/**
 * Resolves a stored avatar path safely.
 * Returns null if it would escape the upload root.
 */
export function resolveAvatarPath(storedPath: string): string | null {
  const absolute = path.resolve(AVATAR_ROOT, storedPath);
  return absolute.startsWith(path.resolve(AVATAR_ROOT)) ? absolute : null;
}

export interface SaveAvatarResult {
  storedPath: string;
  contentType: string;
  bytes: number;
}

export async function saveAvatar(
  userId: string,
  file: File
): Promise<SaveAvatarResult> {
  if (file.size === 0) {
    throw new InvalidAvatarError("Image file is empty");
  }
  if (file.size > MAX_AVATAR_BYTES) {
    throw new InvalidAvatarError("Image must be 2 MB or smaller");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const kind = detectImageKind(buffer);
  if (!kind) {
    throw new InvalidAvatarError("Image must be a JPEG, PNG or WebP file");
  }

  // Re-encoded to a 512px square WebP: an avatar is shown at most 112px wide,
  // and a fresh encode drops EXIF (GPS, device) and anything appended to the file.
  let image: Buffer;
  try {
    image = await sharp(buffer, { limitInputPixels: 40_000_000, failOn: "error" })
      .rotate()
      .resize(AVATAR_SIZE, AVATAR_SIZE, { fit: "cover" })
      .webp({ quality: 85 })
      .toBuffer();
  } catch {
    throw new InvalidAvatarError("Image could not be read");
  }

  const previous = await prisma.user.findUnique({
    where: { id: userId },
    select: { avatarPath: true },
  });

  await mkdir(AVATAR_ROOT, { recursive: true });
  const storedPath = `${userId}-${randomUUID()}.webp`;
  await writeFile(path.join(AVATAR_ROOT, storedPath), image);

  await prisma.user.update({
    where: { id: userId },
    data: { avatarPath: storedPath },
  });

  // Best-effort cleanup; a leftover file is harmless, a failed upload is not.
  await removeAvatarFile(previous?.avatarPath);

  return { storedPath, contentType: "image/webp", bytes: image.length };
}

export async function deleteAvatar(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { avatarPath: true },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { avatarPath: null },
  });

  await removeAvatarFile(user?.avatarPath);
}

async function removeAvatarFile(storedPath: string | null | undefined) {
  if (!storedPath) return;
  const absolute = resolveAvatarPath(storedPath);
  if (!absolute) return;
  await unlink(absolute).catch(() => undefined);
}
