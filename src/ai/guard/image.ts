import sharp from "sharp";
import type { ImageMediaType } from "@/ai/types";

/**
 * Images are identified by their bytes, never by the file name or the
 * browser's declared type, so an SVG, PDF or DOCX renamed to .png is refused.
 */
export function detectImageType(bytes: Uint8Array): ImageMediaType | null {
  const b = bytes;
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (
    b.length >= 8 &&
    b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 &&
    b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a
  ) {
    return "image/png";
  }
  if (
    b.length >= 12 &&
    String.fromCharCode(b[0], b[1], b[2], b[3]) === "RIFF" &&
    String.fromCharCode(b[8], b[9], b[10], b[11]) === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

export class ImageRejectedError extends Error {
  constructor(readonly code: "AI_IMAGE_INVALID" | "AI_IMAGE_TOO_LARGE") {
    super(code);
  }
}

export interface CleanImage {
  bytes: Buffer;
  mediaType: ImageMediaType;
}

/**
 * Checks size and type, then re-encodes: decoding and writing a fresh file
 * drops EXIF and every other metadata block (sharp keeps none unless asked)
 * and anything appended after the image data. Large images are scaled down,
 * which also bounds the tokens the model spends on them.
 */
export async function sanitizeImage(bytes: Uint8Array, maxBytes: number): Promise<CleanImage> {
  if (bytes.length === 0) throw new ImageRejectedError("AI_IMAGE_INVALID");
  if (bytes.length > maxBytes) throw new ImageRejectedError("AI_IMAGE_TOO_LARGE");
  const mediaType = detectImageType(bytes);
  if (!mediaType) throw new ImageRejectedError("AI_IMAGE_INVALID");

  try {
    let pipeline = sharp(bytes, { limitInputPixels: 40_000_000, failOn: "error" })
      .rotate()
      .resize({ width: 1568, height: 1568, fit: "inside", withoutEnlargement: true });
    pipeline =
      mediaType === "image/png" ? pipeline.png() : mediaType === "image/webp" ? pipeline.webp({ quality: 85 }) : pipeline.jpeg({ quality: 85 });
    return { bytes: await pipeline.toBuffer(), mediaType };
  } catch {
    throw new ImageRejectedError("AI_IMAGE_INVALID");
  }
}
