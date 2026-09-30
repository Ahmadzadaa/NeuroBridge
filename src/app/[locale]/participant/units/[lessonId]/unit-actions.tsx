"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

/** Same bound as PROJECT_MAX_LENGTH in units-service (not imported: server module). */
const MAX = 5000;
const MIN = 20;

export function MarkVideoWatched({ lessonId }: { lessonId: string }) {
  const t = useTranslations("units");
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function mark() {
    setBusy(true);
    const res = await fetch(`/api/lessons/${lessonId}/complete`, { method: "POST" }).catch(() => null);
    setBusy(false);
    if (res?.ok) router.refresh();
    else setError(true);
  }

  return (
    <div className="mt-4">
      <Button variant="outline" onClick={mark} disabled={busy}>
        {t("markWatched")}
      </Button>
      {error && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {t("error")}
        </p>
      )}
    </div>
  );
}

export function ProjectForm({ lessonId, initial }: { lessonId: string; initial: string }) {
  const t = useTranslations("units");
  const router = useRouter();
  const [content, setContent] = useState(initial);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    const res = await fetch(`/api/units/${lessonId}/project`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    }).catch(() => null);
    setStatus(res?.ok ? "saved" : "error");
    if (res?.ok) router.refresh();
  }

  return (
    <form onSubmit={save} className="mt-5 space-y-2">
      <Label htmlFor={`project-${lessonId}`}>{t("yourAnswer")}</Label>
      <textarea
        id={`project-${lessonId}`}
        required
        minLength={MIN}
        maxLength={MAX}
        rows={8}
        value={content}
        onChange={(e) => {
          setContent(e.target.value);
          setStatus("idle");
        }}
        className="w-full rounded-lg border border-input bg-card p-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">{t("chars", { count: content.length, max: MAX })}</span>
        <Button type="submit" disabled={status === "saving" || content.trim().length < MIN}>
          {initial ? t("updateProject") : t("submitProject")}
        </Button>
      </div>
      <p aria-live="polite" className={status === "error" ? "text-sm text-destructive" : "text-sm text-success"}>
        {status === "saved" ? t("projectSaved") : status === "error" ? t("error") : ""}
      </p>
    </form>
  );
}
