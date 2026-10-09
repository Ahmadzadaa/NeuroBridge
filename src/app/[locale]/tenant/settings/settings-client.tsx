"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useApiErrorMessage } from "@/lib/api/api-error";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { IconTile, Reveal } from "@/components/ui/ios";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FormSection } from "@/components/tenant/form-section";
import { SettingGroup, SettingToggle } from "@/components/tenant/setting-toggle";
import { toast } from "sonner";
import {
  Award,
  Bell,
  Building2,
  CalendarCheck,
  CalendarX,
  FileBadge,
  Globe,
  Loader2,
  Mail,
  MailPlus,
  MapPin,
  Medal,
  Phone,
  TrendingUp,
  User,
} from "lucide-react";

export interface TenantSettingsData {
  name: string;
  website: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  authorizedContact: string | null;
  participationCertificate: boolean;
  achievementCertificate: boolean;
  completionCertificate: boolean;
  sendInvitationEmail: boolean;
  programStartReminder: boolean;
  programEndReminder: boolean;
  certificateNotification: boolean;
  weeklyProgressNotification: boolean;
}

interface SettingsPageClientProps {
  userName: string;
  initialSettings: TenantSettingsData;
}

type BoolField = {
  [K in keyof TenantSettingsData]: TenantSettingsData[K] extends boolean ? K : never;
}[keyof TenantSettingsData];

/**
 * Defined at module level, not inside the page component: a component created
 * during render is remounted on every keystroke, which the React Compiler lint
 * rule flags and which would drop focus and restart the spinner.
 */
function SaveButton({
  saving,
  label,
  loadingLabel,
  onSave,
}: {
  saving: boolean;
  label: string;
  loadingLabel: string;
  onSave: () => void;
}) {
  return (
    <div className="mt-5 flex justify-end">
      <Button size="lg" disabled={saving} onClick={onSave}>
        {/* Was a bare "…" string, which read as a stalled button. */}
        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
        {saving ? loadingLabel : label}
      </Button>
    </div>
  );
}

export function SettingsPageClient({
  userName,
  initialSettings,
}: SettingsPageClientProps) {
  const t = useTranslations("tenant.settings");
  const td = useTranslations("tenant.settingsDetail");
  const apiError = useApiErrorMessage();
  const tc = useTranslations("common");
  const [settings, setSettings] = useState(initialSettings);
  const [saving, setSaving] = useState(false);

  // The server re-sends settings after a refresh. Reconciling during render is
  // React's documented way to adjust state when a prop changes — an effect
  // would render the stale values once before correcting them.
  const [syncedFrom, setSyncedFrom] = useState(initialSettings);
  if (initialSettings !== syncedFrom) {
    setSyncedFrom(initialSettings);
    setSettings(initialSettings);
  }

  async function saveSettings(fields: Partial<TenantSettingsData>) {
    setSaving(true);
    try {
      const res = await fetch("/api/tenant/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });

      if (!res.ok) {
        toast.error(apiError(await res.json().catch(() => null)));
        return;
      }

      const updated = await res.json();
      setSettings(updated);
      toast.success(t("saved"));
    } catch {
      // Without this the rejected promise was unhandled: the spinner kept
      // spinning and the operator was never told the save had not happened.
      toast.error(t("saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  function setField(field: BoolField, value: boolean) {
    setSettings((prev) => ({ ...prev, [field]: value }));
  }

  const orgFields = [
    { key: "name" as const, label: t("orgName"), icon: Building2, tone: "violet" as const, type: "text" },
    { key: "website" as const, label: t("website"), icon: Globe, tone: "sky" as const, type: "url" },
    { key: "authorizedContact" as const, label: t("contact"), icon: User, tone: "amber" as const, type: "text" },
    { key: "phone" as const, label: t("phone"), icon: Phone, tone: "emerald" as const, type: "tel" },
    { key: "email" as const, label: t("email"), icon: Mail, tone: "indigo" as const, type: "email" },
    { key: "address" as const, label: t("address"), icon: MapPin, tone: "rose" as const, type: "text" },
  ];

  const certificateToggles = [
    { field: "participationCertificate" as const, icon: FileBadge, key: "participation" },
    { field: "achievementCertificate" as const, icon: Medal, key: "achievement" },
    { field: "completionCertificate" as const, icon: Award, key: "completion" },
  ];

  /**
   * `pending: true` marks a switch whose value is stored but which nothing
   * reads yet — no code path sends these notifications. Leaving them
   * unmarked in a polished list would imply they work.
   */
  const notificationToggles = [
    { field: "sendInvitationEmail" as const, icon: MailPlus, key: "invitation", pending: true },
    { field: "programStartReminder" as const, icon: CalendarCheck, key: "start", pending: true },
    { field: "programEndReminder" as const, icon: CalendarX, key: "end", pending: true },
    { field: "certificateNotification" as const, icon: Award, key: "certificate", pending: true },
    { field: "weeklyProgressNotification" as const, icon: TrendingUp, key: "weekly", pending: true },
  ];

  return (
    <DashboardLayout panel="tenant" title={t("title")} userName={userName}>
      <Reveal className="mx-auto mb-6 flex max-w-3xl items-center gap-4">
        <IconTile icon={Building2} tone="violet" size="lg" />
        <div className="min-w-0">
          <h2 className="truncate text-[24px] font-bold tracking-[-0.6px] text-foreground">{settings.name}</h2>
          {settings.email && <p className="truncate text-[14px] text-muted-foreground">{settings.email}</p>}
        </div>
      </Reveal>
      <Tabs defaultValue="organization" className="ios-reveal mx-auto max-w-3xl [--i:1]">
        <TabsList className="grid w-full grid-cols-3 sm:inline-flex sm:w-auto">
          <TabsTrigger value="organization">{t("organization")}</TabsTrigger>
          <TabsTrigger value="certificates">{t("certificates")}</TabsTrigger>
          <TabsTrigger value="notifications">{t("notifications")}</TabsTrigger>
        </TabsList>

        <TabsContent value="organization">
          {/* The card used to repeat the tab's own name as its title. */}
          <FormSection title={t("organization")} description={td("organization.description")}>
            {/* Settings-style rows: icon, label, the value editable in place. */}
            <div className="divide-y divide-border/60 overflow-hidden rounded-[20px] bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)] ring-1 ring-border/60">
              {orgFields.map(({ key, label, icon, tone, type }) => (
                <div key={key} className="flex min-h-[56px] items-center gap-3.5 px-4 focus-within:bg-muted/40">
                  <IconTile icon={icon} tone={tone} size="sm" />
                  <label htmlFor={`org-${key}`} className="w-28 shrink-0 text-[15px] text-foreground sm:w-36">
                    {label}
                  </label>
                  <input
                    id={`org-${key}`}
                    type={type}
                    value={settings[key] ?? ""}
                    onChange={(e) => setSettings({ ...settings, [key]: e.target.value })}
                    className="h-12 min-w-0 flex-1 bg-transparent text-right text-[15px] text-foreground outline-none placeholder:text-muted-foreground/60"
                  />
                </div>
              ))}
            </div>
            <SaveButton
              saving={saving}
              label={tc("save")}
              loadingLabel={tc("loading")}
              onSave={() =>
                saveSettings({
                  name: settings.name,
                  website: settings.website,
                  authorizedContact: settings.authorizedContact,
                  phone: settings.phone,
                  email: settings.email,
                  address: settings.address,
                })
              }
            />
          </FormSection>
        </TabsContent>

        <TabsContent value="certificates">
          <FormSection
            title={t("certificates")}
            description={td("certificates.description")}
          >
            <SettingGroup>
              {certificateToggles.map(({ field, icon, key }) => (
                <SettingToggle
                  key={field}
                  id={`cert-${field}`}
                  icon={icon}
                  title={td(`certificates.${key}.title`)}
                  description={td(`certificates.${key}.description`)}
                  checked={settings[field]}
                  onCheckedChange={(checked) => setField(field, checked)}
                />
              ))}
            </SettingGroup>
            <SaveButton
              saving={saving}
              label={tc("save")}
              loadingLabel={tc("loading")}
              onSave={() =>
                saveSettings({
                  participationCertificate: settings.participationCertificate,
                  achievementCertificate: settings.achievementCertificate,
                  completionCertificate: settings.completionCertificate,
                })
              }
            />
          </FormSection>
        </TabsContent>

        <TabsContent value="notifications">
          <FormSection
            title={t("notifications")}
            description={td("notifications.description")}
          >
            <p className="mb-4 flex gap-2.5 rounded-2xl bg-warning/10 p-4 text-[13px] leading-[1.6] text-foreground ring-1 ring-warning/30">
              <Bell className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
              {td("notifications.pendingNotice")}
            </p>
            <SettingGroup>
              {notificationToggles.map(({ field, icon, key, pending }) => (
                <SettingToggle
                  key={field}
                  id={`notif-${field}`}
                  icon={icon}
                  title={td(`notifications.${key}.title`)}
                  description={td(`notifications.${key}.description`)}
                  badge={pending ? td("notifications.pendingBadge") : undefined}
                  checked={settings[field]}
                  onCheckedChange={(checked) => setField(field, checked)}
                />
              ))}
            </SettingGroup>
            <SaveButton
              saving={saving}
              label={tc("save")}
              loadingLabel={tc("loading")}
              onSave={() =>
                saveSettings({
                  sendInvitationEmail: settings.sendInvitationEmail,
                  programStartReminder: settings.programStartReminder,
                  programEndReminder: settings.programEndReminder,
                  certificateNotification: settings.certificateNotification,
                  weeklyProgressNotification: settings.weeklyProgressNotification,
                })
              }
            />
          </FormSection>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
