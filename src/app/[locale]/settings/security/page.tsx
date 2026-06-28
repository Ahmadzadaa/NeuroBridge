"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function SecuritySettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
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
    const res = await fetch("/api/auth/2fa/setup", { method: "POST" });
    setLoading(false);
    if (!res.ok) {
      toast.error("Failed to start two-factor setup");
      return;
    }
    const data = await res.json();
    setQrDataUrl(data.qrDataUrl);
  }

  async function enable2FA() {
    setLoading(true);
    const res = await fetch("/api/auth/2fa/enable", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ totpCode }),
    });
    setLoading(false);
    if (!res.ok) {
      toast.error("Invalid verification code");
      return;
    }
    const data = await res.json();
    setRecoveryCodes(data.recoveryCodes);
    toast.success("Two-factor authentication enabled");
    router.refresh();
  }

  if (status === "loading") return null;

  const needsSetup = session?.user?.requires2FASetup;

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Two-Factor Authentication</CardTitle>
          <CardDescription>
            {needsSetup
              ? "Admin accounts must enable two-factor authentication before accessing the platform."
              : "Manage your account security settings."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!qrDataUrl && !recoveryCodes && (
            <Button onClick={startSetup} disabled={loading}>
              {loading ? "..." : "Generate QR Code"}
            </Button>
          )}
          {qrDataUrl && !recoveryCodes && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrDataUrl} alt="2FA QR Code" className="mx-auto h-48 w-48" />
              <div className="space-y-2">
                <Label htmlFor="enableTotp">Verification code</Label>
                <Input
                  id="enableTotp"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value)}
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                />
              </div>
              <Button onClick={enable2FA} disabled={loading || totpCode.length !== 6}>
                Enable 2FA
              </Button>
            </>
          )}
          {recoveryCodes && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Save these recovery codes securely:</p>
              <ul className="rounded-md bg-muted p-4 font-mono text-sm">
                {recoveryCodes.map((code) => (
                  <li key={code}>{code}</li>
                ))}
              </ul>
              <Button onClick={() => router.push("/")}>Continue</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
