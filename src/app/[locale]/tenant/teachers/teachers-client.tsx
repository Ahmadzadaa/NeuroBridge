"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useApiErrorMessage } from "@/lib/api/api-error";
import {
  FileText,
  Loader2,
  Mail,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/ui/empty-state";
import { LargeTitle } from "@/components/ui/ios";
import { avatarTone } from "@/components/ui/avatar-tone";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface TeacherRow {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  studentCount: number;
  scenarioCount: number;
}

interface TeachersPageClientProps {
  locale: string;
  userName: string;
  canManage: boolean;
  teachers: TeacherRow[];
}

export function TeachersPageClient({
  userName,
  canManage,
  teachers,
}: TeachersPageClientProps) {
  const t = useTranslations("teacher.manage");
  const apiError = useApiErrorMessage();
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ email: "", firstName: "", lastName: "" });
  // Set after a new account was created: whether its set-password link went out.
  const [invite, setInvite] = useState<{ emailed: boolean } | null>(null);

  const formValid =
    form.email.includes("@") &&
    form.firstName.trim().length > 0 &&
    form.lastName.trim().length > 0;

  async function createTeacher(e: React.FormEvent) {
    e.preventDefault();
    if (!formValid || saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/teachers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email.trim().toLowerCase(),
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          locale,
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        created?: boolean;
        emailed?: boolean;
        error?: string;
      } | null;
      if (!res.ok) {
        toast.error(apiError(data));
        return;
      }
      toast.success(t("created"));
      if (data?.created) setInvite({ emailed: Boolean(data.emailed) });
      else closeDialog();
      router.refresh();
    } catch {
      toast.error(tc("error"));
    } finally {
      setSaving(false);
    }
  }

  async function removeTeacher(email: string) {
    try {
      const res = await fetch("/api/teachers", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error();
      toast.success(t("removed"));
      router.refresh();
    } catch {
      toast.error(tc("error"));
    }
  }

  function closeDialog() {
    setDialogOpen(false);
    setInvite(null);
    setForm({ email: "", firstName: "", lastName: "" });
  }

  return (
    <DashboardLayout panel="tenant" title={t("title")} userName={userName}>
      <LargeTitle
        className="mb-6"
        title={t("title")}
        subtitle={t("subtitle")}
        actions={
          canManage && (
            <Button size="lg" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              {t("addTeacher")}
            </Button>
          )
        }
      />

      {teachers.length === 0 ? (
        <div className="rounded-[22px] bg-card ring-1 ring-border/60">
          <EmptyState title={tc("noData")} description={t("empty")} />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {teachers.map((teacher, i) => (
            <div
              key={teacher.id}
              style={{ "--i": i + 1 } as React.CSSProperties}
              className="ios-reveal group rounded-[22px] bg-card p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)] ring-1 ring-border/60 transition-transform duration-300 hover:-translate-y-0.5"
            >
              <div className="flex items-start justify-between">
                <span
                  aria-hidden="true"
                  className={`flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br text-[15px] font-semibold uppercase text-white ${avatarTone(teacher.id)}`}
                >
                  {teacher.name
                    .split(" ")
                    .map((part) => part[0])
                    .slice(0, 2)
                    .join("")}
                </span>
                {canManage && (
                  <button
                    type="button"
                    aria-label={t("remove")}
                    onClick={() => removeTeacher(teacher.email)}
                    className="rounded-lg p-1.5 text-muted-foreground transition-all hover:bg-destructive/10 hover:text-destructive sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
              </div>
              <p className="mt-3 truncate text-[17px] font-semibold tracking-[-0.3px]">
                {teacher.name}
              </p>
              <p className="truncate text-[13px] text-muted-foreground">
                {teacher.email}
              </p>
              <div className="mt-4 flex items-center gap-2 text-[12px] font-medium text-muted-foreground">
                <span className="flex items-center gap-1.5 rounded-full bg-muted/70 px-2.5 py-1">
                  <Users className="h-3.5 w-3.5" aria-hidden="true" />
                  {t("studentCount", { count: teacher.studentCount })}
                </span>
                <span className="flex items-center gap-1.5 rounded-full bg-muted/70 px-2.5 py-1">
                  <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                  {t("scenarioCount", { count: teacher.scenarioCount })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Add teacher dialog ───────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("addTeacher")}</DialogTitle>
            <DialogDescription>{t("addDescription")}</DialogDescription>
          </DialogHeader>

          {invite ? (
            <div className="space-y-4 py-2">
              <div className={invite.emailed ? "rounded-2xl bg-success/10 p-4" : "rounded-2xl bg-warning/10 p-4"}>
                <p className={`flex items-center gap-2 text-[14px] font-semibold ${invite.emailed ? "text-success" : "text-warning-dark"}`}>
                  <Mail className="h-4 w-4" aria-hidden="true" />
                  {invite.emailed ? t("inviteSent", { email: form.email }) : t("inviteNotSent")}
                </p>
                <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">{t("inviteHint")}</p>
              </div>
              <Button className="w-full rounded-xl" onClick={closeDialog}>
                {tc("close")}
              </Button>
            </div>
          ) : (
            <form onSubmit={createTeacher} className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="teacher-first">{t("firstName")}</Label>
                  <Input
                    id="teacher-first"
                    required
                    maxLength={100}
                    value={form.firstName}
                    onChange={(e) =>
                      setForm({ ...form, firstName: e.target.value })
                    }
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="teacher-last">{t("lastName")}</Label>
                  <Input
                    id="teacher-last"
                    required
                    maxLength={100}
                    value={form.lastName}
                    onChange={(e) =>
                      setForm({ ...form, lastName: e.target.value })
                    }
                    className="rounded-xl"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="teacher-email">{t("email")}</Label>
                <Input
                  id="teacher-email"
                  type="email"
                  required
                  maxLength={255}
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="muellim@uni.edu.az"
                  className="rounded-xl"
                />
              </div>
              <Button
                type="submit"
                disabled={!formValid || saving}
                className="w-full rounded-xl"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  t("create")
                )}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
