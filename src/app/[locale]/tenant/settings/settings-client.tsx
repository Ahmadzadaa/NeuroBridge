"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

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

export function SettingsPageClient({
  userName,
  initialSettings,
}: SettingsPageClientProps) {
  const t = useTranslations("tenant.settings");
  const tc = useTranslations("common");
  const [settings, setSettings] = useState(initialSettings);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSettings(initialSettings);
  }, [initialSettings]);

  async function saveSettings(fields: Partial<TenantSettingsData>) {
    setSaving(true);
    const res = await fetch("/api/tenant/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    });
    setSaving(false);

    if (!res.ok) {
      toast.error("Failed to save settings");
      return;
    }

    const updated = await res.json();
    setSettings(updated);
    toast.success("Settings saved");
  }

  return (
    <DashboardLayout panel="tenant" title={t("title")} userName={userName}>
      <Tabs defaultValue="organization" className="mx-auto max-w-3xl">
        <TabsList className="rounded-xl">
          <TabsTrigger value="organization">{t("organization")}</TabsTrigger>
          <TabsTrigger value="certificates">{t("certificates")}</TabsTrigger>
          <TabsTrigger value="notifications">{t("notifications")}</TabsTrigger>
        </TabsList>

        <TabsContent value="organization">
          <Card className="mt-4 rounded-2xl border-0 shadow-sm">
            <CardHeader>
              <CardTitle>{t("organization")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{t("orgName")}</Label>
                <Input
                  className="rounded-xl"
                  value={settings.name}
                  onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("website")}</Label>
                <Input
                  className="rounded-xl"
                  value={settings.website ?? ""}
                  onChange={(e) => setSettings({ ...settings, website: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("contact")}</Label>
                <Input
                  className="rounded-xl"
                  value={settings.authorizedContact ?? ""}
                  onChange={(e) =>
                    setSettings({ ...settings, authorizedContact: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>{t("phone")}</Label>
                <Input
                  className="rounded-xl"
                  value={settings.phone ?? ""}
                  onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("email")}</Label>
                <Input
                  className="rounded-xl"
                  type="email"
                  value={settings.email ?? ""}
                  onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("address")}</Label>
                <Input
                  className="rounded-xl"
                  value={settings.address ?? ""}
                  onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                />
              </div>
              <Button
                className="rounded-xl"
                disabled={saving}
                onClick={() =>
                  saveSettings({
                    name: settings.name,
                    website: settings.website,
                    authorizedContact: settings.authorizedContact,
                    phone: settings.phone,
                    email: settings.email,
                    address: settings.address,
                  })
                }
              >
                {saving ? "..." : tc("save")}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="certificates">
          <Card className="mt-4 rounded-2xl border-0 shadow-sm">
            <CardHeader>
              <CardTitle>{t("certificates")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(
                [
                  ["participationCert", "participationCertificate"],
                  ["achievementCert", "achievementCertificate"],
                  ["completionCert", "completionCertificate"],
                ] as const
              ).map(([labelKey, fieldKey]) => (
                <div
                  key={fieldKey}
                  className="flex items-center justify-between rounded-xl border p-3"
                >
                  <span className="text-sm">{t(labelKey)}</span>
                  <Switch
                    checked={settings[fieldKey]}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, [fieldKey]: checked })
                    }
                  />
                </div>
              ))}
              <Button
                className="rounded-xl"
                disabled={saving}
                onClick={() =>
                  saveSettings({
                    participationCertificate: settings.participationCertificate,
                    achievementCertificate: settings.achievementCertificate,
                    completionCertificate: settings.completionCertificate,
                  })
                }
              >
                {saving ? "..." : tc("save")}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card className="mt-4 rounded-2xl border-0 shadow-sm">
            <CardHeader>
              <CardTitle>{t("notifications")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(
                [
                  ["sendInvitation", "sendInvitationEmail"],
                  ["programStartReminder", "programStartReminder"],
                  ["programEndReminder", "programEndReminder"],
                  ["certificateNotification", "certificateNotification"],
                  ["weeklyProgress", "weeklyProgressNotification"],
                ] as const
              ).map(([labelKey, fieldKey]) => (
                <div
                  key={fieldKey}
                  className="flex items-center justify-between rounded-xl border p-3"
                >
                  <span className="text-sm">{t(labelKey)}</span>
                  <Switch
                    checked={settings[fieldKey]}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, [fieldKey]: checked })
                    }
                  />
                </div>
              ))}
              <Button
                className="rounded-xl"
                disabled={saving}
                onClick={() =>
                  saveSettings({
                    sendInvitationEmail: settings.sendInvitationEmail,
                    programStartReminder: settings.programStartReminder,
                    programEndReminder: settings.programEndReminder,
                    certificateNotification: settings.certificateNotification,
                    weeklyProgressNotification: settings.weeklyProgressNotification,
                  })
                }
              >
                {saving ? "..." : tc("save")}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
