/**
 * What may be attached to a support message. Shared by the browser (to warn
 * early) and the server (which decides, checking each file's first bytes).
 */
export const MAX_ATTACHMENTS = 5;
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

export const ATTACHMENT_TYPES: Record<string, { ext: string[]; image: boolean }> = {
  "image/png": { ext: ["png"], image: true },
  "image/jpeg": { ext: ["jpg", "jpeg"], image: true },
  "image/gif": { ext: ["gif"], image: true },
  "image/webp": { ext: ["webp"], image: true },
  "application/pdf": { ext: ["pdf"], image: false },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": { ext: ["docx"], image: false },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": { ext: ["xlsx"], image: false },
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": { ext: ["pptx"], image: false },
  "text/plain": { ext: ["txt", "log"], image: false },
  "text/csv": { ext: ["csv"], image: false },
};

/** For a file input's `accept` attribute. */
export const ACCEPT_ATTRIBUTE = Object.entries(ATTACHMENT_TYPES)
  .flatMap(([type, k]) => [type, ...k.ext.map((e) => `.${e}`)])
  .join(",");

export const isImageType = (contentType: string) => ATTACHMENT_TYPES[contentType]?.image === true;

/** Whether a file's name has an allowed extension (the server still checks its content). */
export const hasAllowedExtension = (name: string) => {
  const ext = name.toLowerCase().split(".").pop() ?? "";
  return Object.values(ATTACHMENT_TYPES).some((k) => k.ext.includes(ext));
};

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
