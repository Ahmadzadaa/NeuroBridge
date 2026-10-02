"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

const ACCEPTED = ["video/mp4", "video/webm", "video/quicktime"];

/** The file's length as the browser reads it, or null when it cannot tell (e.g. some .mov files). */
function readDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    const done = (value: number | null) => {
      URL.revokeObjectURL(url);
      resolve(value);
    };
    video.preload = "metadata";
    video.onloadedmetadata = () => done(Number.isFinite(video.duration) && video.duration > 0 ? Math.round(video.duration) : null);
    video.onerror = () => done(null);
    video.src = url;
  });
}

/** Streams the file to our storage, reporting progress (fetch cannot report upload progress). */
function upload(url: string, file: File, onProgress: (share: number) => void): Promise<{ videoKey: string; durationSec: number | null }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve(JSON.parse(xhr.responseText)) : reject(new Error(String(xhr.status))));
    xhr.onerror = () => reject(new Error("network"));
    xhr.send(file);
  });
}

export function VideoFileUpload({
  lessonId,
  videoKey,
  maxMb,
  onChange,
}: {
  lessonId: string;
  videoKey: string | null;
  maxMb: number;
  onChange: (next: { videoKey: string | null; durationSec?: number | null }) => void;
}) {
  const t = useTranslations("superAdmin.content");
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [removing, setRemoving] = useState(false);

  async function pick(file: File | undefined) {
    if (!file) return;
    if (!ACCEPTED.includes(file.type)) return toast.error(t("unsupportedType"));
    if (file.size > maxMb * 1024 * 1024) return toast.error(t("tooLarge", { max: maxMb }));
    setProgress(0);
    try {
      const duration = await readDuration(file);
      const query = duration ? `?duration=${duration}` : "";
      const result = await upload(`/api/admin/lessons/${lessonId}/video/file${query}`, file, setProgress);
      onChange({ videoKey: result.videoKey, durationSec: result.durationSec });
      toast.success(t("uploaded"));
    } catch {
      toast.error(t("uploadError"));
    } finally {
      setProgress(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function remove() {
    if (!window.confirm(t("confirmRemove"))) return;
    setRemoving(true);
    try {
      const res = await fetch(`/api/admin/lessons/${lessonId}/video/file`, { method: "DELETE" });
      if (!res.ok) throw new Error(String(res.status));
      onChange({ videoKey: null });
      toast.success(t("removed"));
    } catch {
      toast.error(t("uploadError"));
    } finally {
      setRemoving(false);
    }
  }

  const busy = progress !== null;
  return (
    <div className="space-y-3 rounded-2xl bg-muted/40 p-4 ring-1 ring-border/50">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[15px] font-semibold">{t("fileHeading")}</p>
          <p className="text-[12px] text-muted-foreground">{t("fileHint", { max: maxMb })}</p>
        </div>
        <div className="flex gap-2">
          <input ref={inputRef} type="file" accept={ACCEPTED.join(",")} className="sr-only" tabIndex={-1} onChange={(e) => pick(e.target.files?.[0])} />
          <Button type="button" variant="outline" disabled={busy || removing} onClick={() => inputRef.current?.click()}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Upload className="h-4 w-4" aria-hidden="true" />}
            {videoKey ? t("replace") : t("upload")}
          </Button>
          {videoKey && (
            <Button type="button" variant="outline" disabled={busy || removing} onClick={remove} aria-label={t("removeFile")}>
              {removing ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Trash2 className="h-4 w-4" aria-hidden="true" />}
            </Button>
          )}
        </div>
      </div>
      {busy && (
        <div className="space-y-1" role="status">
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
          <p className="text-[12px] text-muted-foreground">{t("uploading", { percent: Math.round(progress * 100) })}</p>
        </div>
      )}
      {videoKey && !busy && (
        <video
          key={videoKey}
          src={`/api/lessons/${lessonId}/video/file?v=${encodeURIComponent(videoKey.split("/").pop() ?? "")}`}
          controls
          preload="metadata"
          className="aspect-video w-full rounded-xl bg-black"
          aria-label={t("preview")}
        />
      )}
    </div>
  );
}
