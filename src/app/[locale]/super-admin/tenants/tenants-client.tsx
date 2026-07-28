"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Building2,
  Copy,
  Loader2,
  Mail,
  Pause,
  Play,
  Plus,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusChip, type StatusChipVariant } from "@/components/ui/status-chip";
import { Switch } from "@/components/ui/switch";
import {
  TENANT_FEATURES,
  TENANT_TYPES,
  presetFor,
  type TenantFeature,
  type TenantType,
} from "@/lib/tenant/features";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface TenantRow {
  id: string;
  name: string;
  email: string | null;
  status: string;
  seatLimit: number;
  seatsUsed: number;
  planType: string;
  createdAt: string;
  userCount: number;
  programCount: number;
}

interface TenantsPageClientProps {
  locale: string;
  userName: string;
  tenants: TenantRow[];
}

const PLANS = ["starter", "professional", "enterprise"] as const;

export function TenantsPageClient({
  locale,
  userName,
  tenants,
}: TenantsPageClientProps) {
  const t = useTranslations("superAdmin.tenants");
  const tc = useTranslations("common");
  const router = useRouter();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    adminEmail: "",
    adminFirstName: "",
    adminLastName: "",
    seatLimit: 100,
    planType: "professional" as (typeof PLANS)[number],
    tenantType: "FULL" as TenantType,
    modules: presetFor("FULL"),
  });
  const [provisioned, setProvisioned] = useState<{
    tempPassword: string;
    emailSent: boolean;
    adminEmail: string;
  } | null>(null);

  const formValid =
    form.name.trim().length >= 2 &&
    form.adminEmail.includes("@") &&
    form.adminFirstName.trim().length > 0 &&
    form.adminLastName.trim().length > 0 &&
    form.seatLimit >= 1;

  async function createTenant(e: React.FormEvent) {
    e.preventDefault();
    if (!formValid || saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          name: form.name.trim(),
          adminFirstName: form.adminFirstName.trim(),
          adminLastName: form.adminLastName.trim(),
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        tempPassword?: string;
        emailSent?: boolean;
        error?: string;
      } | null;
      if (!res.ok) {
        toast.error(data?.error ?? tc("error"));
        return;
      }
      setProvisioned({
        tempPassword: data?.tempPassword ?? "",
        emailSent: data?.emailSent ?? false,
        adminEmail: form.adminEmail,
      });
      toast.success(t("created"));
      router.refresh();
    } catch {
      toast.error(tc("error"));
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(tenant: TenantRow) {
    const nextStatus = tenant.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      const res = await fetch(`/api/tenants/${tenant.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) throw new Error();
      toast.success(
        nextStatus === "ACTIVE" ? t("activated") : t("deactivated")
      );
      router.refresh();
    } catch {
      toast.error(tc("error"));
    }
  }

  function statusChip(status: string) {
    const variant: StatusChipVariant =
      status === "ACTIVE" ? "active" : status === "INACTIVE" ? "inactive" : "pending";
    const label =
      status === "ACTIVE"
        ? tc("active")
        : status === "INACTIVE"
          ? tc("inactive")
          : tc("pending");
    return <StatusChip variant={variant}>{label}</StatusChip>;
  }

  function closeDialog() {
    setDialogOpen(false);
    setProvisioned(null);
    setForm({
      name: "",
      adminEmail: "",
      adminFirstName: "",
      adminLastName: "",
      seatLimit: 100,
      planType: "professional",
      tenantType: "FULL",
      modules: presetFor("FULL"),
    });
  }

  return (
    <DashboardLayout panel="super-admin" title={t("title")} userName={userName}>
      <div className="overflow-hidden rounded-2xl bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-[15px] font-semibold">{t("title")}</h2>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              {t("subtitle")}
            </p>
          </div>
          <Button className="rounded-xl" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            {t("createTenant")}
          </Button>
        </div>

        {tenants.length === 0 ? (
          <EmptyState title={tc("noData")} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("name")}</TableHead>
                <TableHead>{t("status")}</TableHead>
                <TableHead>{t("seats")}</TableHead>
                <TableHead>{t("plan")}</TableHead>
                <TableHead>{t("usage")}</TableHead>
                <TableHead>{t("createdAt")}</TableHead>
                <TableHead className="text-right">{tc("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants.map((tenant) => (
                <TableRow key={tenant.id}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Building2 className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-medium">
                          {tenant.name}
                        </span>
                        <span className="block truncate text-[11px] text-muted-foreground">
                          {tenant.email}
                        </span>
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{statusChip(tenant.status)}</TableCell>
                  <TableCell className="tabular-nums">
                    {tenant.seatsUsed} / {tenant.seatLimit}
                  </TableCell>
                  <TableCell>
                    <span className="rounded-full bg-subtle px-2.5 py-0.5 text-[11px] font-semibold capitalize text-muted-foreground">
                      {tenant.planType}
                    </span>
                  </TableCell>
                  <TableCell className="text-[12px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Users className="h-3 w-3" aria-hidden="true" />
                      {tenant.userCount}
                    </span>
                    <span className="ml-3">
                      {t("programCount", { count: tenant.programCount })}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(tenant.createdAt).toLocaleDateString(locale)}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-lg"
                        onClick={() => toggleStatus(tenant)}
                      >
                        {tenant.status === "ACTIVE" ? (
                          <>
                            <Pause className="h-3.5 w-3.5" aria-hidden="true" />
                            {t("deactivate")}
                          </>
                        ) : (
                          <>
                            <Play className="h-3.5 w-3.5" aria-hidden="true" />
                            {t("activate")}
                          </>
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* ── Provision dialog ─────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("createTenant")}</DialogTitle>
            <DialogDescription>{t("createDescription")}</DialogDescription>
          </DialogHeader>

          {provisioned ? (
            <div className="space-y-4 py-2">
              <div className="rounded-xl bg-success/10 p-4">
                <p className="flex items-center gap-2 text-[14px] font-semibold text-success">
                  <Mail className="h-4 w-4" aria-hidden="true" />
                  {provisioned.emailSent
                    ? t("credentialsEmailed", { email: provisioned.adminEmail })
                    : t("credentialsNotEmailed")}
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <code className="rounded-lg bg-card px-3 py-1.5 font-mono text-[15px]">
                    {provisioned.tempPassword}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-lg"
                    onClick={() => {
                      navigator.clipboard.writeText(provisioned.tempPassword);
                      toast.success(t("passwordCopied"));
                    }}
                  >
                    <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                </div>
                <p className="mt-2 text-[12px] text-muted-foreground">
                  {t("passwordShownOnce")}
                </p>
              </div>
              <Button className="w-full rounded-xl" onClick={closeDialog}>
                {t("done")}
              </Button>
            </div>
          ) : (
            <form onSubmit={createTenant} className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="tenant-name">{t("name")}</Label>
                <Input
                  id="tenant-name"
                  required
                  maxLength={200}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder={t("namePlaceholder")}
                  className="rounded-xl"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="admin-first">{t("adminFirstName")}</Label>
                  <Input
                    id="admin-first"
                    required
                    maxLength={100}
                    value={form.adminFirstName}
                    onChange={(e) =>
                      setForm({ ...form, adminFirstName: e.target.value })
                    }
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="admin-last">{t("adminLastName")}</Label>
                  <Input
                    id="admin-last"
                    required
                    maxLength={100}
                    value={form.adminLastName}
                    onChange={(e) =>
                      setForm({ ...form, adminLastName: e.target.value })
                    }
                    className="rounded-xl"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="admin-email">{t("adminEmail")}</Label>
                <Input
                  id="admin-email"
                  type="email"
                  required
                  maxLength={255}
                  value={form.adminEmail}
                  onChange={(e) =>
                    setForm({ ...form, adminEmail: e.target.value })
                  }
                  placeholder="admin@teskilat.com"
                  className="rounded-xl"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="seat-limit">{t("seatLimit")}</Label>
                  <Input
                    id="seat-limit"
                    type="number"
                    min={1}
                    max={100000}
                    required
                    value={form.seatLimit}
                    onChange={(e) =>
                      setForm({ ...form, seatLimit: Number(e.target.value) })
                    }
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="plan">{t("plan")}</Label>
                  <Select
                    value={form.planType}
                    onValueChange={(v) =>
                      v && setForm({ ...form, planType: v as (typeof PLANS)[number] })
                    }
                  >
                    <SelectTrigger id="plan" className="w-full rounded-xl capitalize">
                      <SelectValue>{form.planType}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {PLANS.map((plan) => (
                        <SelectItem key={plan} value={plan} className="capitalize">
                          {plan}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Modules: the type seeds the switches, each stays editable. */}
              <div className="space-y-3 rounded-xl border border-border p-4">
                <div className="space-y-1.5">
                  <Label htmlFor="tenant-type">{t("tenantType")}</Label>
                  <Select
                    value={form.tenantType}
                    onValueChange={(v) => {
                      if (!v) return;
                      const next = v as TenantType;
                      // Switching type re-seeds the flags; they can then be
                      // adjusted one by one below.
                      setForm({
                        ...form,
                        tenantType: next,
                        modules: presetFor(next),
                      });
                    }}
                  >
                    <SelectTrigger id="tenant-type" className="w-full rounded-xl">
                      <SelectValue>{t(`tenantTypes.${form.tenantType}`)}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {TENANT_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {t(`tenantTypes.${type}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">
                    {t("tenantTypeHint")}
                  </p>
                </div>

                <div className="space-y-2 border-t border-border pt-3">
                  {TENANT_FEATURES.map((feature) => (
                    <label
                      key={feature}
                      className="flex items-center justify-between gap-3 text-[13px]"
                    >
                      <span>{t(`modules.${feature}`)}</span>
                      <Switch
                        checked={form.modules[feature]}
                        onCheckedChange={(checked) =>
                          setForm({
                            ...form,
                            modules: {
                              ...form.modules,
                              [feature as TenantFeature]: checked,
                            },
                          })
                        }
                      />
                    </label>
                  ))}
                </div>
              </div>

              <Button
                type="submit"
                disabled={!formValid || saving}
                className="w-full rounded-xl"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  t("provision")
                )}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
