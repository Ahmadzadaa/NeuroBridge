"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Copy, Loader2, Minus, Plus, Unlock } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import type { TenantFeature, TenantFeatureSet } from "@/lib/tenant/features";
import { cn } from "@/lib/utils";

// Mirrors TENANT_FEATURES; that module reads the database, so it stays off the client.
const TENANT_FEATURES: TenantFeature[] = ["teachers", "hackathon", "simulations", "trainings", "aiTools"];

async function patchTenant(tenantId: string, body: Record<string, unknown>) {
  const res = await fetch(`/api/tenants/${tenantId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(String(res.status));
}

/** The organisation's modules, switchable in place while answering a request. */
export function TenantModuleSwitches({ tenantId, modules }: { tenantId: string; modules: TenantFeatureSet }) {
  const t = useTranslations("superAdmin.tenants.modules");
  const ts = useTranslations("support.inspector");
  const router = useRouter();
  const [state, setState] = useState(modules);
  const [busy, setBusy] = useState<TenantFeature | null>(null);

  async function toggle(feature: TenantFeature, next: boolean) {
    setBusy(feature);
    setState((s) => ({ ...s, [feature]: next }));
    try {
      await patchTenant(tenantId, { modules: { [feature]: next } });
      toast.success(ts("saved"));
      router.refresh();
    } catch {
      setState((s) => ({ ...s, [feature]: !next }));
      toast.error(ts("saveError"));
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      {TENANT_FEATURES.map((feature) => (
        // A plain row, not a <label>: wrapping the switch in one delivers each click twice.
        <div key={feature} className="flex min-h-[48px] items-center justify-between gap-3 px-4 py-2">
          <span id={`module-${feature}`} className="text-[15px] text-foreground">
            {t(feature)}
          </span>
          <Switch
            aria-labelledby={`module-${feature}`}
            checked={state[feature]}
            disabled={busy !== null}
            onCheckedChange={(next) => toggle(feature, next)}
          />
        </div>
      ))}
    </>
  );
}

/** Seat limit with a stepper; it cannot go below the seats already in use. */
export function SeatLimitEditor({ tenantId, seatLimit, seatsUsed }: { tenantId: string; seatLimit: number; seatsUsed: number }) {
  const t = useTranslations("support.inspector");
  const router = useRouter();
  const [value, setValue] = useState(seatLimit);
  const [saving, setSaving] = useState(false);
  const min = Math.max(1, seatsUsed);
  const pct = seatLimit > 0 ? Math.min(100, Math.round((seatsUsed / seatLimit) * 100)) : 0;

  async function save() {
    setSaving(true);
    try {
      await patchTenant(tenantId, { seatLimit: value });
      toast.success(t("saved"));
      router.refresh();
    } catch {
      toast.error(t("saveError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3 px-4 py-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[15px] text-foreground">{t("seats")}</span>
        <span className="text-[13px] tabular-nums text-muted-foreground">{t("seatsUsed", { used: seatsUsed, limit: seatLimit })}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
        <div className={cn("h-full rounded-full", pct >= 90 ? "bg-amber-500" : "bg-primary")} style={{ width: `${pct}%` }} />
      </div>
      <div className="flex items-center gap-2">
        <div className="inline-flex items-center rounded-full bg-muted p-0.5">
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-full text-foreground transition-colors hover:bg-card disabled:opacity-40"
            disabled={value <= min}
            onClick={() => setValue((v) => Math.max(min, v - 1))}
            aria-label={t("fewerSeats")}
          >
            <Minus className="h-4 w-4" aria-hidden="true" />
          </button>
          <input
            type="number"
            inputMode="numeric"
            min={min}
            max={100000}
            value={value}
            onChange={(e) => setValue(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
            className="w-16 bg-transparent text-center text-[15px] font-semibold tabular-nums outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
            aria-label={t("seats")}
          />
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-full text-foreground transition-colors hover:bg-card"
            onClick={() => setValue((v) => Math.min(100000, v + 1))}
            aria-label={t("moreSeats")}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        {value !== seatLimit && (
          <Button size="sm" className="rounded-full" disabled={saving || value < min} onClick={save}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Check className="h-4 w-4" aria-hidden="true" />}
            {t("save")}
          </Button>
        )}
      </div>
    </div>
  );
}

/** Suspends or reactivates the whole organisation. Asks first: everyone in it is affected. */
export function TenantStatusButton({ tenantId, status }: { tenantId: string; status: string }) {
  const t = useTranslations("support.inspector");
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const active = status === "ACTIVE";

  async function run() {
    if (active && !window.confirm(t("confirmSuspend"))) return;
    setBusy(true);
    try {
      await patchTenant(tenantId, { status: active ? "INACTIVE" : "ACTIVE" });
      toast.success(active ? t("suspended") : t("activated"));
      router.refresh();
    } catch {
      toast.error(t("saveError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={run}
      disabled={busy}
      className={cn(
        "flex min-h-[48px] w-full items-center justify-center gap-2 px-4 text-[15px] font-medium transition-colors disabled:opacity-50",
        active ? "text-destructive hover:bg-destructive/5" : "text-primary hover:bg-primary/5"
      )}
    >
      {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {active ? t("suspend") : t("activate")}
    </button>
  );
}

export function UnlockUserButton({ userId }: { userId: string }) {
  const t = useTranslations("support.inspector");
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/unlock`, { method: "POST" });
      if (!res.ok) throw new Error(String(res.status));
      toast.success(t("unlocked"));
      router.refresh();
    } catch {
      toast.error(t("saveError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button size="sm" variant="outline" className="rounded-full" disabled={busy} onClick={run}>
      {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Unlock className="h-4 w-4" aria-hidden="true" />}
      {t("unlock")}
    </Button>
  );
}

export function CopyButton({ value, label }: { value: string; label: string }) {
  const t = useTranslations("support.inspector");
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setDone(true);
          toast.success(t("copied"));
          setTimeout(() => setDone(false), 1500);
        } catch {
          toast.error(t("saveError"));
        }
      }}
    >
      {done ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
    </button>
  );
}
