"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Download, FileSpreadsheet, FileText, FileType2, Presentation, X } from "lucide-react";
import { formatBytes, hasAllowedExtension, isImageType, MAX_ATTACHMENT_BYTES, MAX_ATTACHMENTS } from "@/lib/support/attachment-types";
import { cn } from "@/lib/utils";

export type SentAttachment = { id: string; name: string; contentType: string; size: number };

const fileUrl = (id: string) => `/api/support/attachments/${id}`;

function FileGlyph({ name, className }: { name: string; className?: string }) {
  const ext = name.toLowerCase().split(".").pop();
  const Icon = ext === "xlsx" || ext === "csv" ? FileSpreadsheet : ext === "pptx" ? Presentation : ext === "pdf" ? FileType2 : FileText;
  return <Icon className={className} aria-hidden="true" />;
}

/**
 * Files chosen but not sent yet. Checks what the browser can (count, size,
 * extension) so a mistake shows at once; the server checks the content.
 */
export function useAttachmentDraft() {
  const t = useTranslations("support.attachments");
  const [files, setFiles] = useState<File[]>([]);

  const add = useCallback(
    (incoming: FileList | File[] | null) => {
      if (!incoming) return;
      setFiles((current) => {
        const next = [...current];
        for (const file of Array.from(incoming)) {
          if (next.length >= MAX_ATTACHMENTS) {
            toast.error(t("tooMany", { max: MAX_ATTACHMENTS }));
            break;
          }
          if (!hasAllowedExtension(file.name)) {
            toast.error(t("notAllowed", { name: file.name }));
            continue;
          }
          if (file.size > MAX_ATTACHMENT_BYTES) {
            toast.error(t("tooLarge", { name: file.name, max: formatBytes(MAX_ATTACHMENT_BYTES) }));
            continue;
          }
          next.push(file);
        }
        return next;
      });
    },
    [t]
  );

  const remove = (index: number) => setFiles((current) => current.filter((_, i) => i !== index));
  const clear = () => setFiles([]);
  return { files, add, remove, clear };
}

/** Pasted screenshots arrive as nameless images; give them a name the server accepts. */
export function filesFromClipboard(event: React.ClipboardEvent): File[] {
  return Array.from(event.clipboardData.files).map((file, i) =>
    file.name && hasAllowedExtension(file.name) ? file : new File([file], `screenshot-${Date.now()}-${i + 1}.${file.type.split("/")[1] || "png"}`, { type: file.type })
  );
}

/** The chosen files above the text field, each removable. */
export function DraftChips({ files, onRemove }: { files: File[]; onRemove: (index: number) => void }) {
  const t = useTranslations("support.attachments");
  const previews = useMemo(() => files.map((f) => (f.type.startsWith("image/") ? URL.createObjectURL(f) : null)), [files]);
  useEffect(() => () => previews.forEach((url) => url && URL.revokeObjectURL(url)), [previews]);
  if (files.length === 0) return null;

  return (
    <ul className="flex flex-wrap gap-2 px-1 pb-2" aria-label={t("selected")}>
      {files.map((file, i) => (
        <li key={`${file.name}-${i}`} className="relative flex items-center gap-2 rounded-[14px] bg-muted/70 py-1.5 pl-1.5 pr-8 ring-1 ring-border/60">
          {previews[i] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previews[i]!} alt="" className="h-9 w-9 rounded-[10px] object-cover" />
          ) : (
            <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-card text-primary">
              <FileGlyph name={file.name} className="h-[18px] w-[18px]" />
            </span>
          )}
          <span className="min-w-0">
            <span className="block max-w-[160px] truncate text-[13px] font-medium">{file.name}</span>
            <span className="block text-[11px] text-muted-foreground">{formatBytes(file.size)}</span>
          </span>
          <button
            type="button"
            onClick={() => onRemove(i)}
            aria-label={t("remove", { name: file.name })}
            className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-foreground/70 text-background transition-opacity hover:opacity-80"
          >
            <X className="h-3 w-3" aria-hidden="true" />
          </button>
        </li>
      ))}
    </ul>
  );
}

/** What came with a message: pictures as a small gallery, other files as cards to download. */
export function MessageAttachments({ items, mine }: { items: SentAttachment[]; mine: boolean }) {
  const t = useTranslations("support.attachments");
  if (items.length === 0) return null;
  const images = items.filter((a) => isImageType(a.contentType));
  const files = items.filter((a) => !isImageType(a.contentType));

  return (
    <div className={cn("flex flex-col gap-1.5", mine ? "items-end" : "items-start")}>
      {images.length > 0 && (
        <div className={cn("grid gap-1.5", images.length === 1 ? "grid-cols-1" : "grid-cols-2")}>
          {images.map((img) => (
            <a
              key={img.id}
              href={fileUrl(img.id)}
              target="_blank"
              rel="noopener"
              className="block overflow-hidden rounded-[16px] bg-muted ring-1 ring-border/60 transition-opacity hover:opacity-90"
              title={img.name}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={fileUrl(img.id)}
                alt={img.name}
                loading="lazy"
                className={cn("object-cover", images.length === 1 ? "max-h-[260px] w-auto max-w-[280px]" : "h-[130px] w-[130px]")}
              />
            </a>
          ))}
        </div>
      )}
      {files.map((file) => (
        <a
          key={file.id}
          href={fileUrl(file.id)}
          target="_blank"
          rel="noopener"
          className="group flex w-[260px] max-w-full items-center gap-3 rounded-[16px] bg-card px-3 py-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.06)] ring-1 ring-border/60 transition-colors hover:bg-muted/50"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-primary/10 text-primary">
            <FileGlyph name={file.name} className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[14px] font-medium text-foreground">{file.name}</span>
            <span className="block text-[12px] text-muted-foreground">{formatBytes(file.size)}</span>
          </span>
          <Download className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" aria-label={t("download")} />
        </a>
      ))}
    </div>
  );
}
