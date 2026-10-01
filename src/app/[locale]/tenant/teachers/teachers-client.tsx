"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useApiErrorMessage } from "@/lib/api/api-error";
import {
  FileText,
  GraduationCap,
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
  locale,
  userName,
  canManage,
  teachers,
}: TeachersPageClientProps) {
  const t = useTranslations("teacher.manage");
  const apiError = useApiErrorMessage();
  const tc = useTranslations("common");
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
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-[14px] text-muted-foreground">
          {t("subtitle")}
        </p>
        {canManage && (
          <Button className="rounded-xl" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            {t("addTeacher")}
          </Button>
        )}
      </div>

      {teachers.length === 0 ? (
        <div className="rounded-2xl bg-card shadow-sm">
          <EmptyState title={tc("noData")} description={t("empty")} />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {teachers.map((teacher) => (
            <div
              key={teacher.id}
              className="group rounded-2xl bg-card p-5 shadow-sm ring-1 ring-transparent transition-all hover:ring-primary/15"
            >
              <div className="flex items-start justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <GraduationCap className="h-5 w-5" aria-hidden="true" />
                </span>
                {canManage && (
                  <button
                    type="button"
                    aria-label={t("remove")}
                    onClick={() => removeTeacher(teacher.email)}
                    className="rounded-lg p-1.5 text-muted-foreground opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
              </div>
              <p className="mt-3 truncate text-[15px] font-semibold">
                {teacher.name}
              </p>
              <p className="truncate text-[12px] text-muted-foreground">
                {teacher.email}
              </p>
              <div className="mt-4 flex items-center gap-4 text-[12px] text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" aria-hidden="true" />
                  {t("studentCount", { count: teacher.studentCount })}
                </span>
                <span className="flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                  {t("scenarioCount", { count: teacher.scenarioCount })}
                </span>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                {new Date(teacher.createdAt).toLocaleDateString(locale)}
              </p>
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
