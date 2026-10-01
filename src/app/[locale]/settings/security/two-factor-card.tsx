"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { IconTile } from "@/components/ui/ios";

/** TOTP setup. `required` is the forced first-login setup for admin accounts. */
export function TwoFactorCard({ enabled, required }: { enabled: boolean; required: boolean }) {
  const router = useRouter();
  const t = useTranslations("security");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function startSetup() {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/2fa/setup", { method: "POST" });
      if (!res.ok) {
        // Setup is rate limited to a few attempts a minute. Showing the same
        // "it failed" message for that as for a real error left people
        // retrying a button that could not succeed yet.
        toast.error(res.status === 429 ? t("tooManyAttempts") : t("setupFailed"));
        return;
      }
      const data = await res.json();
      setQrDataUrl(data.qrDataUrl);
    } catch {
      toast.error(t("setupFailed"));
    } finally {
      setLoading(false);
    }
  }

  async function enable2FA() {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/2fa/enable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ totpCode }),
      });
      if (!res.ok) {
        // Same distinction here: a throttled request is not a wrong code, and
        // telling someone their correct code is invalid sends them in circles.
        toast.error(res.status === 429 ? t("tooManyAttempts") : t("invalidCode"));
        return;
      }
      const data = await res.json();
      setRecoveryCodes(data.recoveryCodes);
      toast.success(t("enabledToast"));
      router.refresh();
    } catch {
      toast.error(t("setupFailed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-[20px] bg-card p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)] ring-1 ring-border/60 sm:p-6">
      <div className="flex items-start gap-3">
        <IconTile icon={ShieldCheck} tone={enabled ? "emerald" : "indigo"} />
        <div className="min-w-0 flex-1">
          <h2 className="text-[17px] font-semibold tracking-[-0.3px] text-foreground">{t("title")}</h2>
          <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">
            {required ? t("subtitleRequired") : enabled ? t("enabledStatus") : t("subtitleManage")}
          </p>
        </div>
      </div>
      <div className="mt-5 space-y-4">
          {!enabled && !qrDataUrl && !recoveryCodes && (
            <Button onClick={startSetup} disabled={loading}>
              {loading ? t("working") : t("generateQr")}
            </Button>
          )}
          {qrDataUrl && !recoveryCodes && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrDataUrl}
                alt={t("qrAlt")}
                className="mx-auto h-48 w-48"
              />
              <p className="text-center text-sm text-muted-foreground">
                {t("qrHint")}
              </p>
              <div className="space-y-2">
                <Label htmlFor="enableTotp">{t("verificationCode")}</Label>
                <Input
                  id="enableTotp"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value)}
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                />
              </div>
              <Button
                onClick={enable2FA}
                disabled={loading || totpCode.length !== 6}
              >
                {loading ? t("working") : t("enable")}
              </Button>
            </>
          )}
          {recoveryCodes && (
            <div className="space-y-2">
              <p className="text-sm font-medium">{t("recoveryTitle")}</p>
              <ul className="rounded-md bg-muted p-4 font-mono text-sm">
                {recoveryCodes.map((code) => (
                  <li key={code}>{code}</li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground">
                {t("recoveryHint")}
              </p>
              <Button onClick={() => router.push("/")}>{t("continue")}</Button>
            </div>
          )}
      </div>
    </section>
  );
}
