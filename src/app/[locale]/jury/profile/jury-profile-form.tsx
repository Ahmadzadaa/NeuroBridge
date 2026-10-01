"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Camera, CheckCircle2, Loader2, Trash2 } from "lucide-react";
import { useApiErrorMessage } from "@/lib/api/api-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, LargeTitle, Reveal } from "@/components/ui/ios";
import { avatarTone } from "@/components/ui/avatar-tone";
import { cn } from "@/lib/utils";

type ProfileUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  headline: string;
  bio: string;
  avatarUrl: string | null;
};

const BIO_MAX = 1500;

export function JuryProfileForm({ user }: { user: ProfileUser }) {
  const t = useTranslations("juryProfile");
  const tc = useTranslations("common");
  const apiError = useApiErrorMessage();
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ firstName: user.firstName, lastName: user.lastName, headline: user.headline, bio: user.bio });
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const complete = Boolean(avatarUrl && form.headline.trim() && form.bio.trim());
  const initials = `${form.firstName[0] ?? ""}${form.lastName[0] ?? ""}` || user.email[0];

  async function uploadAvatar(file: File) {
    setUploading(true);
    try {
      const body = new FormData();
      body.append("avatar", file);
      const res = await fetch("/api/profile/avatar", { method: "POST", body });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(apiError(data));
        return;
      }
      setAvatarUrl(data?.avatarUrl ?? null);
      toast.success(t("photoUpdated"));
      router.refresh();
    } catch {
      toast.error(tc("error"));
    } finally {
      setUploading(false);
    }
  }

  async function removeAvatar() {
    setUploading(true);
    try {
      const res = await fetch("/api/profile/avatar", { method: "DELETE" });
      if (!res.ok) throw new Error();
      setAvatarUrl(null);
      router.refresh();
    } catch {
      toast.error(tc("error"));
    } finally {
      setUploading(false);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/profile/jury", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        toast.error(apiError(await res.json().catch(() => null)));
        return;
      }
      toast.success(t("saved"));
      router.refresh();
    } catch {
      toast.error(tc("error"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <LargeTitle title={t("title")} subtitle={t("subtitle")} />

      <Reveal index={1} className="rounded-[22px] bg-card p-6 text-center shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)] ring-1 ring-border/60">
        <div className="relative mx-auto h-28 w-28">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt={t("photoAlt")} className="h-28 w-28 rounded-full object-cover ring-4 ring-background" />
          ) : (
            <span
              aria-hidden="true"
              className={cn("flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br text-[36px] font-semibold uppercase text-white", avatarTone(user.id))}
            >
              {initials}
            </span>
          )}
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={uploading}
            aria-label={t("changePhoto")}
            className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md ring-4 ring-card transition-transform active:scale-90"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadAvatar(file);
              e.target.value = "";
            }}
          />
        </div>
        <p className="mt-4 text-[20px] font-bold tracking-[-0.4px]">
          {[form.firstName, form.lastName].filter(Boolean).join(" ") || user.email}
        </p>
        {form.headline && <p className="mt-0.5 text-[14px] text-muted-foreground">{form.headline}</p>}
        <p
          className={cn(
            "mx-auto mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-semibold",
            complete ? "bg-success/12 text-success" : "bg-warning/15 text-warning-dark"
          )}
        >
          {complete && <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />}
          {complete ? t("complete") : t("incomplete")}
        </p>
        {avatarUrl && (
          <div className="mt-3">
            <Button variant="ghost" size="sm" onClick={removeAvatar} disabled={uploading} className="text-destructive hover:bg-destructive/10">
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              {t("removePhoto")}
            </Button>
          </div>
        )}
      </Reveal>

      <Reveal index={2}>
        <form
          onSubmit={save}
          className="space-y-4 rounded-[22px] bg-card p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)] ring-1 ring-border/60 sm:p-6"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("firstName")} htmlFor="jp-first">
              <Input id="jp-first" required maxLength={100} value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
            </Field>
            <Field label={t("lastName")} htmlFor="jp-last">
              <Input id="jp-last" required maxLength={100} value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
            </Field>
          </div>
          <Field label={t("headline")} htmlFor="jp-headline" hint={t("headlineHint")}>
            <Input id="jp-headline" maxLength={160} value={form.headline} onChange={(e) => setForm({ ...form, headline: e.target.value })} />
          </Field>
          <Field label={t("bio")} htmlFor="jp-bio" hint={`${form.bio.length}/${BIO_MAX} · ${t("bioHint")}`}>
            <Textarea id="jp-bio" rows={6} maxLength={BIO_MAX} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
          </Field>
          <Button type="submit" size="lg" disabled={saving}>
            {saving ? t("saving") : tc("save")}
          </Button>
        </form>
      </Reveal>
    </div>
  );
}
