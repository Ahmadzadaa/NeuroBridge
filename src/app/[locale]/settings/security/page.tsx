"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";

export default function SecuritySettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const t = useTranslations("security");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

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

  if (status === "loading") return null;

  const needsSetup = session?.user?.requires2FASetup;

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>
            {needsSetup ? t("subtitleRequired") : t("subtitleManage")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!qrDataUrl && !recoveryCodes && (
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
        </CardContent>
      </Card>
    </div>
  );
}
