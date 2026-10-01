"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { LargeTitle } from "@/components/ui/ios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusChip } from "@/components/ui/status-chip";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatKurus } from "@/lib/billing/money";

type Tier = { minParticipants: number; maxParticipants: number | null; pricePerParticipant: number };

export type ServiceRow = {
  id: string;
  code: string;
  name: string;
  active: boolean;
  inUse: boolean;
  tiers: Tier[];
};

/** Tier as typed in the form: counts as text, price in lira (not kuruş). */
type TierDraft = { min: string; max: string; price: string };
type Draft = { id: string | null; code: string; name: string; active: boolean; tiers: TierDraft[] };

const EMPTY_DRAFT: Draft = {
  id: null,
  code: "",
  name: "",
  active: true,
  tiers: [{ min: "1", max: "", price: "" }],
};

const toDraft = (s: ServiceRow): Draft => ({
  id: s.id,
  code: s.code,
  name: s.name,
  active: s.active,
  tiers: s.tiers.map((t) => ({
    min: String(t.minParticipants),
    max: t.maxParticipants === null ? "" : String(t.maxParticipants),
    price: (t.pricePerParticipant / 100).toFixed(2),
  })),
});

const money = (kurus: number) => formatKurus(kurus, "TRY", "tr-TR");

export function ServicesClient({ userName, services }: { userName: string; services: ServiceRow[] }) {
  const t = useTranslations("superAdmin.services");
  const tc = useTranslations("common");
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function setTier(index: number, patch: Partial<TierDraft>) {
    setDraft((d) => d && { ...d, tiers: d.tiers.map((tier, i) => (i === index ? { ...tier, ...patch } : tier)) });
  }

  async function request(url: string, method: string, body?: unknown): Promise<boolean> {
    const res = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.ok) return true;
    const data = await res.json().catch(() => null);
    const known: Record<string, string> = {
      SERVICE_IN_USE: t("inUse"),
      CODE_TAKEN: t("codeTaken"),
      TIER_OVERLAP: t("tierOverlap"),
      TIER_RANGE: t("tierRange"),
    };
    const message = known[data?.code] ?? data?.error ?? tc("error");
    setError(message);
    toast.error(message);
    return false;
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!draft) return;
    setSaving(true);
    setError(null);
    const tiers = draft.tiers.map((tier) => ({
      minParticipants: Number(tier.min),
      maxParticipants: tier.max.trim() === "" ? null : Number(tier.max),
      // Lira in the form, integer kuruş on the wire.
      pricePerParticipant: Math.round(Number(tier.price.replace(",", ".")) * 100),
    }));
    const ok = draft.id
      ? await request(`/api/services/${draft.id}`, "PATCH", { name: draft.name, active: draft.active, tiers })
      : await request("/api/services", "POST", { code: draft.code, name: draft.name, active: draft.active, tiers });
    setSaving(false);
    if (ok) {
      toast.success(t("saved"));
      setDraft(null);
      router.refresh();
    }
  }

  async function toggleActive(service: ServiceRow) {
    if (await request(`/api/services/${service.id}`, "PATCH", { active: !service.active })) router.refresh();
  }

  async function remove(service: ServiceRow) {
    if (!window.confirm(t("confirmDelete", { name: service.name }))) return;
    if (await request(`/api/services/${service.id}`, "DELETE")) {
      toast.success(t("deleted"));
      router.refresh();
    }
  }

  return (
    <DashboardLayout panel="super-admin" title={t("title")} userName={userName}>
      <LargeTitle
        className="mb-6"
        title={t("title")}
        subtitle={t("subtitle")}
        actions={
          <Button
            size="lg"
            onClick={() => {
              setError(null);
              setDraft(EMPTY_DRAFT);
            }}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            {t("add")}
          </Button>
        }
      />
      <div className="overflow-hidden rounded-[22px] bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)] ring-1 ring-border/60">

        {services.length === 0 ? (
          <EmptyState title={tc("noData")} />
        ) : (
          <ul className="divide-y divide-border">
            {services.map((service) => (
              <li key={service.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{service.name}</span>
                    <code className="rounded bg-subtle px-1.5 py-0.5 text-[11px] text-muted-foreground">
                      {service.code}
                    </code>
                    <StatusChip variant={service.active ? "active" : "inactive"}>
                      {service.active ? t("active") : t("inactive")}
                    </StatusChip>
                  </div>
                  <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted-foreground">
                    {service.tiers.map((tier) => (
                      <li key={tier.minParticipants} className="tabular-nums">
                        {tier.minParticipants}–{tier.maxParticipants ?? "∞"}: {money(tier.pricePerParticipant)}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Switch
                    checked={service.active}
                    onCheckedChange={() => toggleActive(service)}
                    aria-label={service.active ? t("deactivate") : t("activate")}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-lg"
                    onClick={() => {
                      setError(null);
                      setDraft(toDraft(service));
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                    {t("edit")}
                  </Button>
                  {!service.inUse && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-lg"
                      onClick={() => remove(service)}
                      aria-label={t("delete")}
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog open={!!draft} onOpenChange={(open) => !open && setDraft(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{draft?.id ? t("editTitle") : t("addTitle")}</DialogTitle>
          </DialogHeader>
          {draft && (
            <form onSubmit={save} className="space-y-4 py-2">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="svc-code">{t("code")}</Label>
                  <Input
                    id="svc-code"
                    required
                    disabled={!!draft.id}
                    placeholder={t("codePlaceholder")}
                    value={draft.code}
                    onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase() })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="svc-name">{t("name")}</Label>
                  <Input
                    id="svc-name"
                    required
                    minLength={2}
                    value={draft.name}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  />
                </div>
              </div>
              {draft.id && <p className="text-[11px] text-muted-foreground">{t("codeLocked")}</p>}

              <label className="flex items-center gap-3 text-sm">
                <Switch checked={draft.active} onCheckedChange={(active) => setDraft({ ...draft, active })} />
                {t("active")}
              </label>

              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">{t("tiers")}</legend>
                <p className="text-[11px] text-muted-foreground">{t("tiersHint")}</p>
                <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 text-[11px] text-muted-foreground">
                  <span>{t("min")}</span>
                  <span>{t("max")}</span>
                  <span>{t("price")}</span>
                  <span className="w-8" />
                </div>
                {draft.tiers.map((tier, i) => (
                  <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] items-center gap-2">
                    <Input
                      type="number"
                      min={1}
                      required
                      aria-label={t("min")}
                      value={tier.min}
                      onChange={(e) => setTier(i, { min: e.target.value })}
                    />
                    <Input
                      type="number"
                      min={1}
                      placeholder="∞"
                      aria-label={t("max")}
                      value={tier.max}
                      onChange={(e) => setTier(i, { max: e.target.value })}
                    />
                    <Input
                      inputMode="decimal"
                      required
                      pattern="\d+([.,]\d{1,2})?"
                      aria-label={t("price")}
                      value={tier.price}
                      onChange={(e) => setTier(i, { price: e.target.value })}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="w-8 px-0"
                      disabled={draft.tiers.length === 1}
                      onClick={() => setDraft({ ...draft, tiers: draft.tiers.filter((_, j) => j !== i) })}
                      aria-label={t("removeTier")}
                    >
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-lg"
                  onClick={() => {
                    const last = draft.tiers[draft.tiers.length - 1];
                    const nextMin = last?.max ? String(Number(last.max) + 1) : "";
                    setDraft({ ...draft, tiers: [...draft.tiers, { min: nextMin, max: "", price: "" }] });
                  }}
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  {t("addTier")}
                </Button>
              </fieldset>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button type="submit" className="w-full rounded-xl" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {t("save")}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
