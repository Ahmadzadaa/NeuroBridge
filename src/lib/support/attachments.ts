import { randomUUID } from "crypto";
import { getStorage } from "@/lib/storage";
import { ATTACHMENT_TYPES, MAX_ATTACHMENT_BYTES, MAX_ATTACHMENTS } from "@/lib/support/attachment-types";

export { ACCEPT_ATTRIBUTE, isImageType, MAX_ATTACHMENT_BYTES, MAX_ATTACHMENTS } from "@/lib/support/attachment-types";

/**
 * Pictures and files sent in support conversations.
 *
 * Only a short list of everyday formats is accepted, and the first bytes of
 * each file must match what it claims to be: a renamed executable is refused,
 * and nothing that a browser could run as a page (HTML, SVG) is ever stored.
 */

const starts = (b: Buffer, ...bytes: number[]) => bytes.every((v, i) => b[i] === v);
const isZip = (b: Buffer) => starts(b, 0x50, 0x4b, 0x03, 0x04);
/** Plain text has no NUL bytes; binaries nearly always do early on. */
const isText = (b: Buffer) => !b.subarray(0, 4096).includes(0);

/** The first bytes each allowed type must start with. */
const MAGIC: Record<string, (b: Buffer) => boolean> = {
  "image/png": (b) => starts(b, 0x89, 0x50, 0x4e, 0x47),
  "image/jpeg": (b) => starts(b, 0xff, 0xd8, 0xff),
  "image/gif": (b) => b.subarray(0, 4).toString("latin1") === "GIF8",
  "image/webp": (b) => b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP",
  "application/pdf": (b) => b.subarray(0, 5).toString("latin1") === "%PDF-",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": isZip,
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": isZip,
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": isZip,
  "text/plain": isText,
  "text/csv": isText,
};

export class SupportAttachmentError extends Error {
  readonly statusCode: number;
  constructor(
    readonly code: "TOO_MANY_FILES" | "FILE_TOO_LARGE" | "FILE_TYPE_NOT_ALLOWED" | "EMPTY_MESSAGE",
    statusCode = 400
  ) {
    super(code);
    this.name = "SupportAttachmentError";
    this.statusCode = statusCode;
  }
}

export type CheckedFile = { name: string; contentType: string; size: number; bytes: Buffer };

/** Keeps a readable name but nothing that could break a header or a path. */
export function safeFileName(name: string): string {
  const cleaned = name.normalize("NFC").replace(/[\\/:*?"<>|\u0000-\u001f]+/g, "_").replace(/\s+/g, " ").trim();
  return (cleaned || "file").slice(-120);
}

/** The type a file really is: by its extension, confirmed by its first bytes. */
export function detectType(name: string, bytes: Buffer): string | null {
  const ext = name.toLowerCase().split(".").pop() ?? "";
  const type = Object.entries(ATTACHMENT_TYPES).find(([, k]) => k.ext.includes(ext))?.[0];
  return type && MAGIC[type]?.(bytes) ? type : null;
}

/** Validates uploaded files: count, size, and that each is what it claims to be. */
export async function checkFiles(files: File[]): Promise<CheckedFile[]> {
  const real = files.filter((f) => f.size > 0);
  if (real.length > MAX_ATTACHMENTS) throw new SupportAttachmentError("TOO_MANY_FILES");
  const checked: CheckedFile[] = [];
  for (const file of real) {
    if (file.size > MAX_ATTACHMENT_BYTES) throw new SupportAttachmentError("FILE_TOO_LARGE", 413);
    const bytes = Buffer.from(await file.arrayBuffer());
    const name = safeFileName(file.name);
    const contentType = detectType(name, bytes);
    if (!contentType) throw new SupportAttachmentError("FILE_TYPE_NOT_ALLOWED", 415);
    checked.push({ name, contentType, size: bytes.length, bytes });
  }
  return checked;
}

/** Puts files in storage, returning the rows to attach to a message. */
export async function storeFiles(tenantId: string, ticketId: string, files: CheckedFile[]) {
  const storage = getStorage();
  const stored = [];
  for (const file of files) {
    const key = `support/${tenantId}/${ticketId}/${randomUUID()}`;
    await storage.put(key, file.bytes, file.contentType);
    stored.push({ key, name: file.name, contentType: file.contentType, size: file.size });
  }
  return stored;
}

/** A message request is JSON (text only) or multipart (text and files). */
export async function readMessageRequest(request: Request): Promise<{ fields: Record<string, string>; files: File[] }> {
  if ((request.headers.get("content-type") ?? "").startsWith("multipart/form-data")) {
    const form = await request.formData();
    const fields: Record<string, string> = {};
    const files: File[] = [];
    for (const [key, value] of form.entries()) {
      if (typeof value === "string") fields[key] = value;
      else if (key === "files") files.push(value);
    }
    return { fields, files };
  }
  const json = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const fields = Object.fromEntries(Object.entries(json).map(([k, v]) => [k, typeof v === "string" ? v : JSON.stringify(v)]));
  return { fields, files: [] };
}
